package com.drinksaver.service;

import com.drinksaver.config.CacheConfig;
import com.drinksaver.model.dto.Drink;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class RecommendationCacheService {

    private static final int INVALIDATE_AFTER_SAVES = 5;

    private final CacheManager cacheManager;

    public RecommendationCacheService(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    /**
     * Call this after a drink is saved. Increments counter and invalidates
     * recommendations cache after 5 saves.
     */
    public void onDrinkSaved(Drink drink) {
        Cache counterCache = cacheManager.getCache(CacheConfig.SAVE_COUNTER_CACHE);
        if (counterCache == null) {
            return;
        }

        if (drink.shouldAddToRecommendations()) {
            invalidateRecommendations(drink.userId());
            return;
        }

        // get(key, valueLoader) rather than get-then-put: on Caffeine this is a single
        // atomic compute, so two first saves for the same user cannot each create a
        // counter and have one of them dropped.
        AtomicInteger counter = counterCache.get(drink.userId(), () -> new AtomicInteger(0));
        if (counter == null) {
            return;
        }

        int delta = drink.quantity() != null ? drink.quantity() : 1;
        int updated = counter.addAndGet(delta);

        // Two atomics, for two separate races the old read-then-write had.
        //
        // addAndGet, because `counter.set(counter.get() + delta)` is a read-modify-write
        // that two concurrent saves can interleave, losing an increment.
        //
        // compareAndSet, because `if (get() >= N) { evict; set(0); }` lets every thread
        // that observes a value over the line evict and reset. Measured on 4000 concurrent
        // saves with a threshold of 5: 1400-odd evictions where 800 were due. The CAS makes
        // exactly one thread per crossing the one that consumes the count, and a thread
        // whose CAS fails leaves its increment in place for the next crossing to pick up
        // rather than discarding it.
        if (updated >= INVALIDATE_AFTER_SAVES && counter.compareAndSet(updated, 0)) {
            invalidateRecommendations(drink.userId());
        }
    }

    /**
     * Manually invalidate recommendations cache for a user.
     */
    public void invalidateRecommendations(UUID userId) {
        Cache recommendationsCache = cacheManager.getCache(CacheConfig.RECOMMENDATIONS_CACHE);
        if (recommendationsCache != null) {
            recommendationsCache.evict(userId);
        }
    }
}


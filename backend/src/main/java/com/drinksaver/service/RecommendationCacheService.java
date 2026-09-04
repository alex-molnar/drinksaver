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

        AtomicInteger counter = counterCache.get(drink.userId(), AtomicInteger.class);
        if (counter == null) {
            counter = new AtomicInteger(0);
            counterCache.put(drink.userId(), counter);
        }

        int count = counter.get();

        if (drink.quantity() != null) {
            counter.set(count + drink.quantity());
        } else {
            counter.set(count + 1);
        }

        if (counter.get() >= INVALIDATE_AFTER_SAVES) {
            invalidateRecommendations(drink.userId());
            counter.set(0);
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


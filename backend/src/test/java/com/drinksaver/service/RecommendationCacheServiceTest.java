package com.drinksaver.service;

import com.drinksaver.model.dto.Drink;
import org.junit.jupiter.api.Test;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static com.drinksaver.config.CacheConfig.RECOMMENDATIONS_CACHE;
import static com.drinksaver.config.CacheConfig.SAVE_COUNTER_CACHE;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RecommendationCacheServiceTest {

    private static final UUID USER = UUID.randomUUID();

    @Test
    void onDrinkSavedWithoutCacheManagerReturnsGracefully() {
        CacheManager cacheManager = mock(CacheManager.class);
        when(cacheManager.getCache(SAVE_COUNTER_CACHE)).thenReturn(null);

        RecommendationCacheService service = new RecommendationCacheService(cacheManager);
        Drink drink = new Drink(USER, "2026-09-08", 1, 2, 3, null, null, null, null, null, false, null, null);

        service.onDrinkSaved(drink);

        verify(cacheManager).getCache(SAVE_COUNTER_CACHE);
    }

    @Test
    void onDrinkSavedThatShouldAddInvalidatesRecommendations() {
        Cache counterCache = mock(Cache.class);
        Cache recCache = mock(Cache.class);
        CacheManager cacheManager = mock(CacheManager.class);
        when(cacheManager.getCache(SAVE_COUNTER_CACHE)).thenReturn(counterCache);
        when(cacheManager.getCache(RECOMMENDATIONS_CACHE)).thenReturn(recCache);

        RecommendationCacheService service = new RecommendationCacheService(cacheManager);
        Drink drink = new Drink(USER, "2026-09-08", 1, 2, 3, null, null, null, null, null, true, null, null);

        service.onDrinkSaved(drink);

        verify(recCache).evict(USER);
    }

    @Test
    void onDrinkSavedCreatesCounterIfNotExists() {
        Cache counterCache = mock(Cache.class);
        when(counterCache.get(USER, AtomicInteger.class)).thenReturn(null);

        Cache recCache = mock(Cache.class);
        CacheManager cacheManager = mock(CacheManager.class);
        when(cacheManager.getCache(SAVE_COUNTER_CACHE)).thenReturn(counterCache);
        when(cacheManager.getCache(RECOMMENDATIONS_CACHE)).thenReturn(recCache);

        RecommendationCacheService service = new RecommendationCacheService(cacheManager);
        Drink drink = new Drink(USER, "2026-09-08", 1, 2, 3, null, null, null, null, 1, false, null, null);

        service.onDrinkSaved(drink);

        verify(counterCache).put(eq(USER), any(AtomicInteger.class));
    }

    @Test
    void invalidateRecommendationsWithoutCacheManagerReturnsGracefully() {
        CacheManager cacheManager = mock(CacheManager.class);
        when(cacheManager.getCache(RECOMMENDATIONS_CACHE)).thenReturn(null);

        RecommendationCacheService service = new RecommendationCacheService(cacheManager);

        service.invalidateRecommendations(USER);

        verify(cacheManager).getCache(RECOMMENDATIONS_CACHE);
    }

    @Test
    void invalidateRecommendationsEvictsUserFromCache() {
        Cache recCache = mock(Cache.class);
        CacheManager cacheManager = mock(CacheManager.class);
        when(cacheManager.getCache(RECOMMENDATIONS_CACHE)).thenReturn(recCache);

        RecommendationCacheService service = new RecommendationCacheService(cacheManager);

        service.invalidateRecommendations(USER);

        verify(recCache).evict(USER);
    }

    @Test
    void onDrinkSavedWithNullQuantityUsesDefaultIncrement() {
        Cache counterCache = mock(Cache.class);
        when(counterCache.get(USER, AtomicInteger.class)).thenReturn(null);

        Cache recCache = mock(Cache.class);
        CacheManager cacheManager = mock(CacheManager.class);
        when(cacheManager.getCache(SAVE_COUNTER_CACHE)).thenReturn(counterCache);
        when(cacheManager.getCache(RECOMMENDATIONS_CACHE)).thenReturn(recCache);

        RecommendationCacheService service = new RecommendationCacheService(cacheManager);
        Drink drink = new Drink(USER, "2026-09-08", 1, 2, 3, null, null, null, null, null, false, null, null);

        service.onDrinkSaved(drink);

        verify(counterCache).put(eq(USER), any(AtomicInteger.class));
    }

    @Test
    void onDrinkSavedDoesNotInvalidateWhenThresholdNotReached() {
        Cache counterCache = mock(Cache.class);
        AtomicInteger counter = new AtomicInteger(0);
        when(counterCache.get(USER, AtomicInteger.class)).thenReturn(counter);

        Cache recCache = mock(Cache.class);
        CacheManager cacheManager = mock(CacheManager.class);
        when(cacheManager.getCache(SAVE_COUNTER_CACHE)).thenReturn(counterCache);
        when(cacheManager.getCache(RECOMMENDATIONS_CACHE)).thenReturn(recCache);

        RecommendationCacheService service = new RecommendationCacheService(cacheManager);
        Drink drink = new Drink(USER, "2026-09-08", 1, 2, 3, null, null, null, null, 1, false, null, null);

        service.onDrinkSaved(drink);

        verify(recCache, never()).evict(USER);
    }
}

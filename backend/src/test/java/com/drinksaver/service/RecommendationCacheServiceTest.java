package com.drinksaver.service;

import com.drinksaver.model.dto.Drink;
import org.junit.jupiter.api.Test;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;

import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.LongAdder;

import static com.drinksaver.config.CacheConfig.RECOMMENDATIONS_CACHE;
import static com.drinksaver.config.CacheConfig.SAVE_COUNTER_CACHE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
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

    /**
     * Counter creation moved from get-then-put to get(key, valueLoader), which is one
     * atomic compute on Caffeine, so this asserts the loader supplies a counter starting
     * at zero rather than asserting which cache method was called.
     */
    @Test
    void onDrinkSavedCreatesACounterStartingAtZeroForAUserWithNone() {
        AtomicReference<AtomicInteger> loaded = new AtomicReference<>();
        Cache counterCache = cacheThatRunsTheLoader(loaded);

        Cache recCache = mock(Cache.class);
        CacheManager cacheManager = mock(CacheManager.class);
        when(cacheManager.getCache(SAVE_COUNTER_CACHE)).thenReturn(counterCache);
        when(cacheManager.getCache(RECOMMENDATIONS_CACHE)).thenReturn(recCache);

        RecommendationCacheService service = new RecommendationCacheService(cacheManager);
        Drink drink = new Drink(USER, "2026-09-08", 1, 2, 3, null, null, null, null, 1, false, null, null);

        service.onDrinkSaved(drink);

        assertThat(loaded.get()).isNotNull();
        assertThat(loaded.get().get()).isEqualTo(1);
        verify(recCache, never()).evict(USER);
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
        AtomicInteger counter = new AtomicInteger(2);
        Cache counterCache = cacheHolding(counter);

        Cache recCache = mock(Cache.class);
        CacheManager cacheManager = mock(CacheManager.class);
        when(cacheManager.getCache(SAVE_COUNTER_CACHE)).thenReturn(counterCache);
        when(cacheManager.getCache(RECOMMENDATIONS_CACHE)).thenReturn(recCache);

        RecommendationCacheService service = new RecommendationCacheService(cacheManager);
        Drink drink = new Drink(USER, "2026-09-08", 1, 2, 3, null, null, null, null, null, false, null, null);

        service.onDrinkSaved(drink);

        assertThat(counter.get()).isEqualTo(3);
        verify(recCache, never()).evict(USER);
    }

    @Test
    void onDrinkSavedDoesNotInvalidateWhenThresholdNotReached() {
        AtomicInteger counter = new AtomicInteger(0);
        Cache counterCache = cacheHolding(counter);

        Cache recCache = mock(Cache.class);
        CacheManager cacheManager = mock(CacheManager.class);
        when(cacheManager.getCache(SAVE_COUNTER_CACHE)).thenReturn(counterCache);
        when(cacheManager.getCache(RECOMMENDATIONS_CACHE)).thenReturn(recCache);

        RecommendationCacheService service = new RecommendationCacheService(cacheManager);
        Drink drink = new Drink(USER, "2026-09-08", 1, 2, 3, null, null, null, null, 1, false, null, null);

        service.onDrinkSaved(drink);

        verify(recCache, never()).evict(USER);
    }

    @SuppressWarnings("unchecked")
    private Cache cacheHolding(AtomicInteger counter) {
        Cache cache = mock(Cache.class);
        try {
            when(cache.get(eq(USER), any(Callable.class))).thenReturn(counter);
        } catch (Exception e) {
            throw new AssertionError(e);
        }
        return cache;
    }

    /**
     * A cache with nothing stored for the user yet: it runs the loader the service passes
     * in, exposing the counter that was created so the test can assert its starting value.
     */
    @SuppressWarnings("unchecked")
    private Cache cacheThatRunsTheLoader(AtomicReference<AtomicInteger> loaded) {
        Cache cache = mock(Cache.class);
        try {
            when(cache.get(eq(USER), any(Callable.class))).thenAnswer(invocation -> {
                AtomicInteger created = (AtomicInteger) ((Callable<Object>) invocation.getArgument(1)).call();
                loaded.set(created);
                return created;
            });
        } catch (Exception e) {
            throw new AssertionError(e);
        }
        return cache;
    }

    /**
     * F4. The counter was updated with `set(get() + delta)` and reset with
     * `if (get() >= N) { evict; set(0); }`. Neither is atomic, and the AtomicInteger made
     * that look safe when it was not.
     *
     * Two bounds, both derived rather than guessed:
     *
     * The upper bound is an invariant of the fix, not a measurement. Every eviction consumes
     * at least INVALIDATE_AFTER_SAVES from the counter, and nothing else removes counts, so
     * SAVES saves can produce at most SAVES / INVALIDATE_AFTER_SAVES evictions however the
     * threads interleave. This is the assertion that has teeth: measured against the old
     * implementation the same run produced 1371 to 1524 evictions where 800 were due,
     * because every thread that saw a value over the line evicted.
     *
     * The lower bound catches the opposite failure, increments going missing, and carries a
     * small slack for counts still sitting under the threshold when the run ends. Measured
     * on the fix: 794 to 798.
     *
     * The test is sound rather than exhaustive. Correct code cannot fail it; broken code can
     * pass it if the scheduler never interleaves, which is why the bound is tight enough that
     * it did not happen in any observed run.
     */
    @Test
    void concurrentSavesNeverEvictMoreOftenThanTheThresholdAllows() throws Exception {
        int threads = 8;
        int savesPerThread = 500;
        int saves = threads * savesPerThread;
        int threshold = 5;

        AtomicInteger counter = new AtomicInteger(0);
        Cache counterCache = cacheHolding(counter);

        Cache recCache = mock(Cache.class);
        LongAdder evictions = new LongAdder();
        doAnswer(invocation -> {
            evictions.increment();
            return null;
        }).when(recCache).evict(USER);

        CacheManager cacheManager = mock(CacheManager.class);
        when(cacheManager.getCache(SAVE_COUNTER_CACHE)).thenReturn(counterCache);
        when(cacheManager.getCache(RECOMMENDATIONS_CACHE)).thenReturn(recCache);

        RecommendationCacheService service = new RecommendationCacheService(cacheManager);
        Drink drink = new Drink(USER, "2026-09-08", 1, 2, 3, null, null, null, null, 1, false, null, null);

        CountDownLatch startTogether = new CountDownLatch(1);
        CountDownLatch finished = new CountDownLatch(threads);
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        try {
            for (int t = 0; t < threads; t++) {
                pool.submit(() -> {
                    try {
                        startTogether.await();
                        for (int i = 0; i < savesPerThread; i++) {
                            service.onDrinkSaved(drink);
                        }
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        finished.countDown();
                    }
                });
            }
            startTogether.countDown();
            assertThat(finished.await(60, TimeUnit.SECONDS)).isTrue();
        } finally {
            pool.shutdownNow();
        }

        assertThat(evictions.sum())
            .isLessThanOrEqualTo(saves / threshold)
            .isGreaterThan(saves / threshold - 20);
    }
}

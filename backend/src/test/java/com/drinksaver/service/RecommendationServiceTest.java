package com.drinksaver.service;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.Recommendation;
import com.drinksaver.service.model.DrinkKey;
import com.drinksaver.service.namecollector.AlcoholNameCollector;
import com.drinksaver.service.namecollector.BeerNameCollector;
import com.drinksaver.service.recommendations.api.RecommendationSource;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The consequence-level counterpart to DrinkKeyTest. The same drink arrives
 * from two sources in different name states, and these tests pin that the user
 * sees it once.
 */
class RecommendationServiceTest {

    private static final UUID USER = UUID.randomUUID();

    private static final DrinkKey NAMED_BEER =
            new DrinkKey(4, null, 6, 1, 1, 3, null, null, Optional.of("Heineken pint"));
    private static final DrinkKey NAMELESS_BEER =
            new DrinkKey(4, null, 6, 1, 1, 3, null, null, Optional.empty());
    private static final DrinkKey NAMELESS_GIN =
            new DrinkKey(1, 1, 2, null, null, null, null, null, Optional.empty());

    private RecommendationService serviceWith(Map<String, RecommendationSource> sources) {
        BeerNameCollector beerNames = mock(BeerNameCollector.class);
        when(beerNames.collectBeerName(any())).thenAnswer(i -> i.getArgument(0, DrinkKey.class).withName("A beer"));

        AlcoholNameCollector alcoholNames = mock(AlcoholNameCollector.class);
        when(alcoholNames.collectAlcoholName(any())).thenAnswer(i -> i.getArgument(0, DrinkKey.class).withName("A drink"));

        RepositoryConfiguration configuration = new RepositoryConfiguration(
                "postgres", "postgres", "postgres", "postgres", "postgres",
                List.of(UUID.randomUUID()), 4, 10, 0.97
        );
        return new RecommendationService(configuration, sources, beerNames, alcoholNames);
    }

    private Map<String, RecommendationSource> sources(Map<DrinkKey, Double> first, Map<DrinkKey, Double> second) {
        Map<String, RecommendationSource> sources = new LinkedHashMap<>();
        sources.put("default", userId -> first);
        sources.put("personal", userId -> second);
        return sources;
    }

    @Test
    void theSameDrinkFromTwoSourcesIsRecommendedOnce() {
        List<Recommendation> result = serviceWith(sources(
                Map.of(NAMED_BEER, 0.0),
                Map.of(NAMELESS_BEER, 0.9)
        )).getRecommendations(USER);

        assertThat(result).hasSize(1);
        assertThat(result).extracting(Recommendation::getName).containsExactly("Heineken pint");
    }

    @Test
    void theMergeKeepsTheHigherScore() {
        List<Recommendation> result = serviceWith(sources(
                Map.of(NAMED_BEER, 0.0, NAMELESS_GIN, 0.1),
                Map.of(NAMELESS_BEER, 0.9)
        )).getRecommendations(USER);

        // Beer merges to 0.9, gin stays 0.1, so beer sorts first.
        assertThat(result).extracting(Recommendation::getName).containsExactly("Heineken pint", "A drink");
    }

    @Test
    void genuinelyDifferentDrinksAreBothRecommended() {
        List<Recommendation> result = serviceWith(sources(
                Map.of(NAMED_BEER, 0.5),
                Map.of(NAMELESS_GIN, 0.4)
        )).getRecommendations(USER);

        assertThat(result).hasSize(2);
    }

    @Test
    void namelessDrinksGetANameFromTheCollectors() {
        List<Recommendation> result = serviceWith(sources(
                Map.of(NAMELESS_BEER, 0.5),
                Map.of()
        )).getRecommendations(USER);

        assertThat(result).extracting(Recommendation::getName).containsExactly("A beer");
    }

    @Test
    void everyRecommendationIsAttributedToTheCallingUser() {
        List<Recommendation> result = serviceWith(sources(
                Map.of(NAMED_BEER, 0.5),
                Map.of()
        )).getRecommendations(USER);

        assertThat(result).extracting(Recommendation::getUserId).containsOnly(USER);
    }
}

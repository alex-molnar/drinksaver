package com.drinksaver.service.recommendations;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.Recommendation;
import com.drinksaver.repository.postgres.schema.RecommendationsTable;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DefaultRecommendationSourceTest {

    private static final UUID USER = UUID.randomUUID();
    private static final UUID ADMIN_ONE = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private DefaultRecommendationSource sourceWith(List<UUID> admins, List<Recommendation> recommendations) {
        RecommendationsTable table = mock(RecommendationsTable.class);
        when(table.findByUserIdIn(admins)).thenReturn(recommendations);
        RepositoryConfiguration config = new RepositoryConfiguration(
                "postgres", "postgres", "postgres", "postgres", "postgres",
                admins, 4, 10, 0.97
        );
        return new DefaultRecommendationSource(table, config);
    }

    @Test
    void emptyAdminListProducesNoDefaultRecommendations() {
        List<Recommendation> result = sourceWith(List.of(), List.of())
                .buildRecommendation(USER, Stream.empty())
                .toList();

        assertThat(result).isEmpty();
    }

    @Test
    void nullAdminListProducesNoDefaultRecommendations() {
        RecommendationsTable table = mock(RecommendationsTable.class);
        RepositoryConfiguration config = new RepositoryConfiguration(
                "postgres", "postgres", "postgres", "postgres", "postgres",
                null, 4, 10, 0.97
        );

        List<Recommendation> result = new DefaultRecommendationSource(table, config)
                .buildRecommendation(USER, Stream.empty())
                .toList();

        assertThat(result).isEmpty();
    }

    @Test
    void appendsAdminRecommendationsAfterProcessedRecommendations() {
        Recommendation processed = recommendation("Personal", 1);
        Recommendation defaultRecommendation = recommendation("Beer", 2);

        List<Recommendation> result = sourceWith(List.of(ADMIN_ONE), List.of(defaultRecommendation))
                .buildRecommendation(USER, Stream.of(processed))
                .toList();

        assertThat(result).containsExactly(processed, defaultRecommendation);
    }

    @Test
    void doesNotDuplicateAnAlreadyProcessedDrink() {
        Recommendation processed = recommendation("Beer", 1);
        Recommendation duplicate = recommendation(null, 1);

        List<Recommendation> result = sourceWith(List.of(ADMIN_ONE), List.of(duplicate))
                .buildRecommendation(USER, Stream.of(processed))
                .toList();

        assertThat(result).containsExactly(processed);
    }

    private Recommendation recommendation(String name, int alcoholTypeId) {
        Recommendation recommendation = new Recommendation();
        recommendation.setUserId(ADMIN_ONE);
        recommendation.setName(name);
        recommendation.setAlcoholTypeId(alcoholTypeId);
        recommendation.setAlcoholVolumeId(3);
        return recommendation;
    }
}

package com.drinksaver.service.recommendations;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.Recommendation;
import com.drinksaver.repository.postgres.schema.RecommendationsTable;
import com.drinksaver.service.model.DrinkKey;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DefaultRecommendationSourceTest {

    private static final UUID USER = UUID.randomUUID();
    private static final UUID ADMIN_ONE = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID ADMIN_TWO = UUID.fromString("00000000-0000-0000-0000-000000000002");

    private DefaultRecommendationSource sourceWith(List<UUID> admins, List<Recommendation> recommendations) {
        RecommendationsTable table = mock(RecommendationsTable.class);
        when(table.findByUserIdIn(admins)).thenReturn(recommendations);

        RepositoryConfiguration config = new RepositoryConfiguration(
                "postgres", "postgres", "postgres", "postgres",
                admins, 4, 10, 0.97
        );
        return new DefaultRecommendationSource(table, config);
    }

    @Test
    void emptyAdminListReturnsEmptyMap() {
        DefaultRecommendationSource source = sourceWith(List.of(), List.of());

        assertThat(source.buildRecommendation(USER)).isEmpty();
    }

    @Test
    void nullAdminListReturnsEmptyMap() {
        RecommendationsTable table = mock(RecommendationsTable.class);
        RepositoryConfiguration config = new RepositoryConfiguration(
                "postgres", "postgres", "postgres", "postgres",
                null, 4, 10, 0.97
        );
        DefaultRecommendationSource source = new DefaultRecommendationSource(table, config);

        assertThat(source.buildRecommendation(USER)).isEmpty();
    }

    @Test
    void buildsMapFromAdminRecommendations() {
        Recommendation rec = new Recommendation();
        rec.setUserId(ADMIN_ONE);
        rec.setAlcoholTypeId(1);
        rec.setAlcoholSubtypeId(2);
        rec.setAlcoholVolumeId(3);
        rec.setBrandId(4);
        rec.setBeerFlavourId(5);
        rec.setConsumptionTypeId(6);
        rec.setName("Beer");

        Map<DrinkKey, Double> result = sourceWith(
                List.of(ADMIN_ONE),
                List.of(rec)
        ).buildRecommendation(USER);

        assertThat(result).hasSize(1);
        assertThat(result.values()).containsExactly(0.0);
    }

    @Test
    void deduplicatesIdenticalDrinksToSingleEntry() {
        Recommendation rec1 = new Recommendation();
        rec1.setUserId(ADMIN_ONE);
        rec1.setAlcoholTypeId(1);
        rec1.setAlcoholSubtypeId(2);
        rec1.setAlcoholVolumeId(3);
        rec1.setBrandId(4);
        rec1.setBeerFlavourId(5);
        rec1.setConsumptionTypeId(6);
        rec1.setName("Beer");

        Recommendation rec2 = new Recommendation();
        rec2.setUserId(ADMIN_TWO);
        rec2.setAlcoholTypeId(1);
        rec2.setAlcoholSubtypeId(2);
        rec2.setAlcoholVolumeId(3);
        rec2.setBrandId(4);
        rec2.setBeerFlavourId(5);
        rec2.setConsumptionTypeId(6);
        rec2.setName("Beer");

        Map<DrinkKey, Double> result = sourceWith(
                List.of(ADMIN_ONE, ADMIN_TWO),
                List.of(rec1, rec2)
        ).buildRecommendation(USER);

        assertThat(result).hasSize(1);
    }

    @Test
    void allRecommendationsScoreZero() {
        Recommendation rec = new Recommendation();
        rec.setUserId(ADMIN_ONE);
        rec.setAlcoholTypeId(1);
        rec.setAlcoholVolumeId(3);

        Map<DrinkKey, Double> result = sourceWith(
                List.of(ADMIN_ONE),
                List.of(rec)
        ).buildRecommendation(USER);

        assertThat(result.values()).allSatisfy(score -> assertThat(score).isEqualTo(0.0));
    }
}

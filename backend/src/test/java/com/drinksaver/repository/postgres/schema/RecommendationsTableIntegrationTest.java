package com.drinksaver.repository.postgres.schema;

import com.drinksaver.model.db.Recommendation;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for RecommendationsTable derived queries.
 * Tests endDate boundary logic and user filtering.
 */
class RecommendationsTableIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final UUID USER = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID OTHER = UUID.fromString("00000000-0000-0000-0000-000000000002");

    @Autowired
    private RecommendationsTable recommendationsTable;

    @Test
    void findByUserIdInReturnsOnlyQueriedUsers() {
        recommendationsTable.saveAll(List.of(
                createRecommendation(USER, "Beer"),
                createRecommendation(OTHER, "Wine")
        ));

        List<Recommendation> result = recommendationsTable.findByUserIdIn(List.of(USER));

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getUserId()).isEqualTo(USER);
    }

    @Test
    void findValidByUserIdExcludesExpiredRecommendations() {
        LocalDateTime now = LocalDateTime.now();
        Recommendation valid = createRecommendation(USER, "Beer");
        valid.setEndDate(now.plusHours(1));

        Recommendation expired = createRecommendation(USER, "Wine");
        expired.setEndDate(now.minusHours(1));

        recommendationsTable.saveAll(List.of(valid, expired));

        List<Recommendation> result = recommendationsTable.findValidByUserId(USER, now);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getName()).isEqualTo("Beer");
    }

    @Test
    void findValidByUserIdIncludesNoEndDateRecommendations() {
        Recommendation noEndDate = createRecommendation(USER, "Beer");
        recommendationsTable.save(noEndDate);

        List<Recommendation> result = recommendationsTable.findValidByUserId(USER, LocalDateTime.now());

        assertThat(result).hasSize(1);
    }

    @Test
    void findValidByUserIdReturnsEmptyForOtherUsers() {
        Recommendation rec = createRecommendation(USER, "Beer");
        recommendationsTable.save(rec);

        List<Recommendation> result = recommendationsTable.findValidByUserId(OTHER, LocalDateTime.now());

        assertThat(result).isEmpty();
    }

    private Recommendation createRecommendation(UUID userId, String name) {
        Recommendation rec = new Recommendation();
        rec.setUserId(userId);
        rec.setName(name);
        rec.setAlcoholTypeId(1);
        rec.setAlcoholVolumeId(1);
        return rec;
    }
}

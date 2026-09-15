package com.drinksaver.service.recommendations;

import com.drinksaver.model.db.Recommendation;
import com.drinksaver.repository.postgres.schema.RecommendationsTable;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PersistentPersonalRecommendationSourceTest {

    private static final UUID USER = UUID.randomUUID();

    @Test
    void emptyRecommendationsLeaveProcessedRecommendationsUnchanged() {
        RecommendationsTable table = mock(RecommendationsTable.class);
        when(table.findValidByUserId(eq(USER), any(LocalDateTime.class))).thenReturn(List.of());
        Recommendation processed = recommendation("Processed", 2);

        List<Recommendation> result = new PersistentPersonalRecommendationSource(table)
                .buildRecommendation(USER, Stream.of(processed))
                .toList();

        assertThat(result).containsExactly(processed);
    }

    @Test
    void appendsValidRecommendations() {
        Recommendation recommendation = recommendation("Beer", 1);
        RecommendationsTable table = mock(RecommendationsTable.class);
        when(table.findValidByUserId(eq(USER), any(LocalDateTime.class))).thenReturn(List.of(recommendation));

        List<Recommendation> result = new PersistentPersonalRecommendationSource(table)
                .buildRecommendation(USER, Stream.empty())
                .toList();

        assertThat(result).containsExactly(recommendation);
    }

    @Test
    void retainsTheAlreadyProcessedVersionOfTheSameDrink() {
        Recommendation processed = recommendation("Beer", 1);
        Recommendation duplicate = recommendation(null, 1);
        RecommendationsTable table = mock(RecommendationsTable.class);
        when(table.findValidByUserId(eq(USER), any(LocalDateTime.class))).thenReturn(List.of(duplicate));

        List<Recommendation> result = new PersistentPersonalRecommendationSource(table)
                .buildRecommendation(USER, Stream.of(processed))
                .toList();

        assertThat(result).containsExactly(processed);
    }

    @Test
    void passesCurrentTimeToTableQuery() {
        RecommendationsTable table = mock(RecommendationsTable.class);
        when(table.findValidByUserId(eq(USER), any(LocalDateTime.class))).thenReturn(List.of());

        new PersistentPersonalRecommendationSource(table).buildRecommendation(USER, Stream.empty()).toList();

        verify(table).findValidByUserId(eq(USER), any(LocalDateTime.class));
    }

    @Test
    void includesDifferentDrinks() {
        Recommendation beer = recommendation("Beer", 1);
        Recommendation gin = recommendation("Gin", 2);
        RecommendationsTable table = mock(RecommendationsTable.class);
        when(table.findValidByUserId(eq(USER), any(LocalDateTime.class))).thenReturn(List.of(beer, gin));

        List<Recommendation> result = new PersistentPersonalRecommendationSource(table)
                .buildRecommendation(USER, Stream.empty())
                .toList();

        assertThat(result).containsExactly(beer, gin);
    }

    private Recommendation recommendation(String name, int alcoholTypeId) {
        Recommendation recommendation = new Recommendation();
        recommendation.setUserId(USER);
        recommendation.setName(name);
        recommendation.setAlcoholTypeId(alcoholTypeId);
        recommendation.setAlcoholVolumeId(3);
        return recommendation;
    }
}

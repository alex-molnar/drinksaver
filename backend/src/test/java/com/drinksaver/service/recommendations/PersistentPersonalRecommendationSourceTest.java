package com.drinksaver.service.recommendations;

import com.drinksaver.model.db.Recommendation;
import com.drinksaver.repository.postgres.schema.RecommendationsTable;
import com.drinksaver.service.model.DrinkKey;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PersistentPersonalRecommendationSourceTest {

    private static final UUID USER = UUID.randomUUID();

    @Test
    void emptyRecommendationsReturnEmptyMap() {
        RecommendationsTable table = mock(RecommendationsTable.class);
        when(table.findValidByUserId(eq(USER), any(LocalDateTime.class))).thenReturn(List.of());

        PersistentPersonalRecommendationSource source = new PersistentPersonalRecommendationSource(table);
        Map<DrinkKey, Double> result = source.buildRecommendation(USER);

        assertThat(result).isEmpty();
    }

    @Test
    void buildsMapFromValidRecommendations() {
        Recommendation rec = new Recommendation();
        rec.setUserId(USER);
        rec.setAlcoholTypeId(1);
        rec.setAlcoholSubtypeId(2);
        rec.setAlcoholVolumeId(3);
        rec.setBrandId(4);
        rec.setBeerFlavourId(5);
        rec.setConsumptionTypeId(6);
        rec.setName("Beer");

        RecommendationsTable table = mock(RecommendationsTable.class);
        when(table.findValidByUserId(eq(USER), any(LocalDateTime.class))).thenReturn(List.of(rec));

        PersistentPersonalRecommendationSource source = new PersistentPersonalRecommendationSource(table);
        Map<DrinkKey, Double> result = source.buildRecommendation(USER);

        assertThat(result).hasSize(1);
        assertThat(result.values()).containsExactly(Double.MAX_VALUE);
    }

    @Test
    void deduplicatesIdenticalDrinks() {
        Recommendation rec1 = new Recommendation();
        rec1.setUserId(USER);
        rec1.setAlcoholTypeId(1);
        rec1.setAlcoholSubtypeId(2);
        rec1.setAlcoholVolumeId(3);
        rec1.setBrandId(4);
        rec1.setBeerFlavourId(5);
        rec1.setConsumptionTypeId(6);
        rec1.setName("Beer");

        Recommendation rec2 = new Recommendation();
        rec2.setUserId(USER);
        rec2.setAlcoholTypeId(1);
        rec2.setAlcoholSubtypeId(2);
        rec2.setAlcoholVolumeId(3);
        rec2.setBrandId(4);
        rec2.setBeerFlavourId(5);
        rec2.setConsumptionTypeId(6);
        rec2.setName("Beer");

        RecommendationsTable table = mock(RecommendationsTable.class);
        when(table.findValidByUserId(eq(USER), any(LocalDateTime.class))).thenReturn(List.of(rec1, rec2));

        PersistentPersonalRecommendationSource source = new PersistentPersonalRecommendationSource(table);
        Map<DrinkKey, Double> result = source.buildRecommendation(USER);

        assertThat(result).hasSize(1);
    }

    @Test
    void passesCurrentTimeToTableQuery() {
        RecommendationsTable table = mock(RecommendationsTable.class);
        when(table.findValidByUserId(eq(USER), any(LocalDateTime.class))).thenReturn(List.of());

        PersistentPersonalRecommendationSource source = new PersistentPersonalRecommendationSource(table);
        source.buildRecommendation(USER);

        verify(table).findValidByUserId(eq(USER), any(LocalDateTime.class));
    }

    @Test
    void multipleDifferentDrinksAreAllIncluded() {
        Recommendation rec1 = new Recommendation();
        rec1.setUserId(USER);
        rec1.setAlcoholTypeId(1);
        rec1.setAlcoholSubtypeId(2);
        rec1.setAlcoholVolumeId(3);
        rec1.setBrandId(4);
        rec1.setBeerFlavourId(5);
        rec1.setConsumptionTypeId(6);
        rec1.setName("Beer");

        Recommendation rec2 = new Recommendation();
        rec2.setUserId(USER);
        rec2.setAlcoholTypeId(1);
        rec2.setAlcoholVolumeId(3);
        rec2.setName("Gin");

        RecommendationsTable table = mock(RecommendationsTable.class);
        when(table.findValidByUserId(eq(USER), any(LocalDateTime.class))).thenReturn(List.of(rec1, rec2));

        PersistentPersonalRecommendationSource source = new PersistentPersonalRecommendationSource(table);
        Map<DrinkKey, Double> result = source.buildRecommendation(USER);

        assertThat(result).hasSize(2);
    }
}

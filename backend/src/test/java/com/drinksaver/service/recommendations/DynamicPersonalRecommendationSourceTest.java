package com.drinksaver.service.recommendations;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.SavedDrink;
import com.drinksaver.repository.postgres.schema.SavedDrinksTable;
import com.drinksaver.service.model.DrinkKey;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DynamicPersonalRecommendationSourceTest {

    private static final UUID USER = UUID.randomUUID();

    private RepositoryConfiguration configWithDecay(double decayFactor) {
        return new RepositoryConfiguration(
                "postgres", "postgres", "postgres", "postgres",
                List.of(), 4, 10, decayFactor
        );
    }

    private SavedDrink drinkOn(String date) {
        return new SavedDrink(USER, date, 1, 2, 3, null, null, null, null);
    }

    private double onlyScore(Map<DrinkKey, Double> result) {
        assertThat(result).hasSize(1);
        return result.values().iterator().next();
    }

    @Test
    void todaysDrinkScoresOne() {
        SavedDrinksTable table = mock(SavedDrinksTable.class);
        when(table.findByUserId(USER)).thenReturn(List.of(drinkOn(LocalDate.now().toString())));

        Map<DrinkKey, Double> result =
                new DynamicPersonalRecommendationSource(configWithDecay(0.97), table).buildRecommendation(USER);

        assertThat(onlyScore(result)).isCloseTo(1.0, within(1e-9));
    }

    @Test
    void olderDrinkDecaysByFactorPerDay() {
        SavedDrinksTable table = mock(SavedDrinksTable.class);
        when(table.findByUserId(USER))
                .thenReturn(List.of(drinkOn(LocalDate.now().minusDays(10).toString())));

        Map<DrinkKey, Double> result =
                new DynamicPersonalRecommendationSource(configWithDecay(0.5), table).buildRecommendation(USER);

        assertThat(onlyScore(result)).isCloseTo(Math.pow(0.5, 10), within(1e-9));
    }

    @Test
    void unparseableDateFallsBackToThirtyDays() {
        SavedDrinksTable table = mock(SavedDrinksTable.class);
        when(table.findByUserId(USER)).thenReturn(List.of(drinkOn("not-a-date")));

        Map<DrinkKey, Double> result =
                new DynamicPersonalRecommendationSource(configWithDecay(0.5), table).buildRecommendation(USER);

        assertThat(onlyScore(result)).isCloseTo(Math.pow(0.5, 30), within(1e-9));
    }

    @Test
    void blankDateFallsBackToThirtyDays() {
        SavedDrinksTable table = mock(SavedDrinksTable.class);
        when(table.findByUserId(USER)).thenReturn(List.of(drinkOn("  ")));

        Map<DrinkKey, Double> result =
                new DynamicPersonalRecommendationSource(configWithDecay(0.5), table).buildRecommendation(USER);

        assertThat(onlyScore(result)).isCloseTo(Math.pow(0.5, 30), within(1e-9));
    }

    @Test
    void nullDateFallsBackToThirtyDays() {
        SavedDrinksTable table = mock(SavedDrinksTable.class);
        when(table.findByUserId(USER)).thenReturn(List.of(drinkOn(null)));

        Map<DrinkKey, Double> result =
                new DynamicPersonalRecommendationSource(configWithDecay(0.5), table).buildRecommendation(USER);

        assertThat(onlyScore(result)).isCloseTo(Math.pow(0.5, 30), within(1e-9));
    }

    @Test
    void futureDateIsClampedToZeroDays() {
        SavedDrinksTable table = mock(SavedDrinksTable.class);
        when(table.findByUserId(USER))
                .thenReturn(List.of(drinkOn(LocalDate.now().plusDays(5).toString())));

        Map<DrinkKey, Double> result =
                new DynamicPersonalRecommendationSource(configWithDecay(0.5), table).buildRecommendation(USER);

        assertThat(onlyScore(result)).isCloseTo(1.0, within(1e-9));
    }

    @Test
    void repeatedDrinksAccumulate() {
        SavedDrinksTable table = mock(SavedDrinksTable.class);
        String today = LocalDate.now().toString();
        when(table.findByUserId(USER)).thenReturn(List.of(drinkOn(today), drinkOn(today)));

        Map<DrinkKey, Double> result =
                new DynamicPersonalRecommendationSource(configWithDecay(0.97), table).buildRecommendation(USER);

        assertThat(onlyScore(result)).isCloseTo(2.0, within(1e-9));
    }

    @Test
    void noDrinksProducesNoRecommendations() {
        SavedDrinksTable table = mock(SavedDrinksTable.class);
        when(table.findByUserId(USER)).thenReturn(List.of());

        Map<DrinkKey, Double> result =
                new DynamicPersonalRecommendationSource(configWithDecay(0.97), table).buildRecommendation(USER);

        assertThat(result).isEmpty();
    }
}

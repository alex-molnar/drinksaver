package com.drinksaver.service.recommendations;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.Recommendation;
import com.drinksaver.model.db.SavedDrink;
import com.drinksaver.repository.postgres.schema.SavedDrinksTable;
import com.drinksaver.service.model.DrinkKey;
import com.drinksaver.service.namecollector.AlcoholNameCollector;
import com.drinksaver.service.namecollector.BeerNameCollector;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DynamicPersonalRecommendationSourceTest {

    private static final UUID USER = UUID.randomUUID();
    private static final Clock CLOCK =
            Clock.fixed(LocalDate.of(2026, 3, 15).atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC);
    private static final LocalDate TODAY = LocalDate.now(CLOCK);

    private DynamicPersonalRecommendationSource sourceWith(double decayFactor, SavedDrinksTable table) {
        RepositoryConfiguration configuration = new RepositoryConfiguration(
                "postgres", "postgres", "postgres", "postgres", "postgres",
                List.of(), 4, 10, decayFactor
        );
        BeerNameCollector beerNames = mock(BeerNameCollector.class);
        when(beerNames.collectBeerName(any(DrinkKey.class)))
                .thenAnswer(invocation -> invocation.getArgument(0, DrinkKey.class).withName("A beer"));
        AlcoholNameCollector alcoholNames = mock(AlcoholNameCollector.class);
        when(alcoholNames.collectAlcoholName(any(DrinkKey.class)))
                .thenAnswer(invocation -> invocation.getArgument(0, DrinkKey.class).withName("A drink"));
        return new DynamicPersonalRecommendationSource(configuration, table, beerNames, alcoholNames, CLOCK);
    }

    private SavedDrink drinkOn(String date, int alcoholTypeId) {
        return new SavedDrink(USER, date, alcoholTypeId, null, 3, null, null, null, null, null, null);
    }

    @Test
    void convertsSavedDrinksToRecommendationsWithoutPersistedOwnership() {
        SavedDrinksTable table = mock(SavedDrinksTable.class);
        when(table.findByUserId(USER)).thenReturn(List.of(drinkOn(TODAY.toString(), 1)));

        List<Recommendation> result = sourceWith(0.97, table)
                .buildRecommendation(USER, Stream.empty())
                .toList();

        assertThat(result).singleElement().satisfies(recommendation -> {
            assertThat(recommendation.getUserId()).isNull();
            assertThat(recommendation.getAlcoholTypeId()).isEqualTo(1);
            assertThat(recommendation.getAlcoholVolumeId()).isEqualTo(3);
        });
    }

    @Test
    void retainsProcessedRecommendationsBeforeDynamicOnes() {
        Recommendation processed = new Recommendation();
        processed.setName("Pinned");
        processed.setAlcoholTypeId(2);
        processed.setAlcoholVolumeId(3);
        SavedDrinksTable table = mock(SavedDrinksTable.class);
        when(table.findByUserId(USER)).thenReturn(List.of(drinkOn(TODAY.toString(), 1)));

        List<Recommendation> result = sourceWith(0.97, table)
                .buildRecommendation(USER, Stream.of(processed))
                .toList();

        assertThat(result).hasSize(2);
        assertThat(result.getFirst()).isSameAs(processed);
        assertThat(result.getLast().getAlcoholTypeId()).isEqualTo(1);
    }

    @Test
    void collapsesRepeatedDrinksIntoOneRecommendation() {
        SavedDrinksTable table = mock(SavedDrinksTable.class);
        SavedDrink drink = drinkOn(TODAY.toString(), 1);
        when(table.findByUserId(USER)).thenReturn(List.of(drink, drink));

        List<Recommendation> result = sourceWith(0.97, table)
                .buildRecommendation(USER, Stream.empty())
                .toList();

        assertThat(result).hasSize(1);
    }

    @Test
    void keepsDifferentDrinksDistinct() {
        SavedDrinksTable table = mock(SavedDrinksTable.class);
        when(table.findByUserId(USER)).thenReturn(List.of(
                drinkOn(TODAY.toString(), 1),
                drinkOn(TODAY.minusDays(10).toString(), 2)
        ));

        List<Recommendation> result = sourceWith(0.5, table)
                .buildRecommendation(USER, Stream.empty())
                .toList();

        assertThat(result).extracting(Recommendation::getAlcoholTypeId).containsExactly(2, 1);
    }

    @Test
    void invalidAndMissingDatesStillProduceRecommendations() {
        SavedDrinksTable table = mock(SavedDrinksTable.class);
        when(table.findByUserId(USER)).thenReturn(List.of(
                drinkOn("not-a-date", 1),
                drinkOn(null, 2)
        ));

        List<Recommendation> result = sourceWith(0.5, table)
                .buildRecommendation(USER, Stream.empty())
                .toList();

        assertThat(result).extracting(Recommendation::getAlcoholTypeId).containsExactly(1, 2);
    }
}

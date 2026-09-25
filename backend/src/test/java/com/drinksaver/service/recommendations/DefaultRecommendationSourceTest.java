package com.drinksaver.service.recommendations;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.Recommendation;
import com.drinksaver.model.db.admin.DefaultRecommendation;
import com.drinksaver.repository.schema.admin.DefaultRecommendationsTable;
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

    private DefaultRecommendationSource sourceWith(List<UUID> admins, List<DefaultRecommendation> defaults) {
        DefaultRecommendationsTable table = mock(DefaultRecommendationsTable.class);
        when(table.findAllByOrderByOrderNumberAsc()).thenReturn(defaults);
        return new DefaultRecommendationSource(table);
    }

    @Test
    void emptyAdminListProducesNoDefaultRecommendations() {
        List<Recommendation> result = sourceWith(List.of(), List.of(defaultRecommendation("Beer", 2)))
                .buildRecommendation(USER, Stream.empty())
                .toList();

        assertThat(result).isEmpty();
    }

    @Test
    void nullAdminListProducesNoDefaultRecommendations() {
        List<Recommendation> result = sourceWith(null, List.of(defaultRecommendation("Beer", 2)))
                .buildRecommendation(USER, Stream.empty())
                .toList();

        assertThat(result).isEmpty();
    }

    @Test
    void appendsDefaultRecommendationsAfterProcessedRecommendations() {
        Recommendation processed = recommendation("Personal", 1);

        List<Recommendation> result = sourceWith(List.of(ADMIN_ONE), List.of(defaultRecommendation("Beer", 2)))
                .buildRecommendation(USER, Stream.of(processed))
                .toList();

        assertThat(result).extracting(Recommendation::getName).containsExactly("Personal", "Beer");
    }

    @Test
    void keepsTheAdminOrderOfTheDefaultTable() {
        List<Recommendation> result = sourceWith(List.of(ADMIN_ONE), List.of(
                        defaultRecommendation("First", 5), defaultRecommendation("Second", 2)))
                .buildRecommendation(USER, Stream.empty())
                .toList();

        assertThat(result).extracting(Recommendation::getName).containsExactly("First", "Second");
    }

    @Test
    void copiesEveryDrinkAndDesignFieldFromTheDefault() {
        DefaultRecommendation source = defaultRecommendation("Heineken", 4);
        source.setAlcoholSubtypeId(6);
        source.setBrandId(7);
        source.setBeerFlavourId(8);
        source.setConsumptionTypeId(9);
        source.setColorPaletteId(10);
        source.setGlasswareId(11);

        Recommendation result = sourceWith(List.of(ADMIN_ONE), List.of(source))
                .buildRecommendation(USER, Stream.empty())
                .findFirst()
                .orElseThrow();

        assertThat(result.getName()).isEqualTo("Heineken");
        assertThat(result.getAlcoholTypeId()).isEqualTo(4);
        assertThat(result.getAlcoholSubtypeId()).isEqualTo(6);
        assertThat(result.getAlcoholVolumeId()).isEqualTo(3);
        assertThat(result.getBrandId()).isEqualTo(7);
        assertThat(result.getBeerFlavourId()).isEqualTo(8);
        assertThat(result.getConsumptionTypeId()).isEqualTo(9);
        assertThat(result.getColorPaletteId()).isEqualTo(10);
        assertThat(result.getGlasswareId()).isEqualTo(11);
    }

    @Test
    void doesNotDuplicateAnAlreadyProcessedDrink() {
        Recommendation processed = recommendation("Beer", 1);

        List<Recommendation> result = sourceWith(List.of(ADMIN_ONE), List.of(defaultRecommendation("Same drink", 1)))
                .buildRecommendation(USER, Stream.of(processed))
                .toList();

        assertThat(result).containsExactly(processed);
    }

    private Recommendation recommendation(String name, int alcoholTypeId) {
        Recommendation recommendation = new Recommendation();
        recommendation.setUserId(USER);
        recommendation.setName(name);
        recommendation.setAlcoholTypeId(alcoholTypeId);
        recommendation.setAlcoholVolumeId(3);
        return recommendation;
    }

    private DefaultRecommendation defaultRecommendation(String name, int alcoholTypeId) {
        DefaultRecommendation recommendation = new DefaultRecommendation();
        recommendation.setName(name);
        recommendation.setAlcoholTypeId(alcoholTypeId);
        recommendation.setAlcoholVolumeId(3);
        return recommendation;
    }
}

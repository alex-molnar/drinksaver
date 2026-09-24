package com.drinksaver.repository.schema;

import com.drinksaver.model.db.admin.DefaultRecommendation;
import com.drinksaver.repository.schema.admin.DefaultRecommendationsTable;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

/**
 * Integration tests for DefaultRecommendationsTable: list ordering, the next order number
 * source, and the native reorder query.
 */
class DefaultRecommendationsTableIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private DefaultRecommendationsTable defaultRecommendationsTable;

    @Test
    void largestOrderNumberIsNullWhenEmptyAndTheMaximumOtherwise() {
        assertThat(defaultRecommendationsTable.getLargestOrderNumber()).isNull();

        defaultRecommendationsTable.saveAll(List.of(create("Beer", 2), create("Wine", 5)));

        assertThat(defaultRecommendationsTable.getLargestOrderNumber()).isEqualTo(5);
    }

    @Test
    void findAllIsSortedByOrderNumber() {
        defaultRecommendationsTable.saveAll(List.of(create("Third", 3), create("First", 1), create("Second", 2)));

        assertThat(defaultRecommendationsTable.findAllByOrderByOrderNumberAsc())
                .extracting(DefaultRecommendation::getName)
                .containsExactly("First", "Second", "Third");
    }

    @Test
    void updateOrderRenumbersAndRenamesFromTheFullList() {
        DefaultRecommendation first = create("First", 1);
        DefaultRecommendation second = create("Second", 2);
        DefaultRecommendation third = create("Third", 3);
        defaultRecommendationsTable.saveAllAndFlush(List.of(first, second, third));

        int updated = defaultRecommendationsTable.updateDefaultRecommendationsOrderArray(
                new Integer[]{third.getId(), first.getId(), second.getId()},
                new String[]{"Renamed third", "First", "Second"}
        );

        assertThat(updated).isEqualTo(3);
        assertThat(defaultRecommendationsTable.findAllByOrderByOrderNumberAsc())
                .extracting(DefaultRecommendation::getName, DefaultRecommendation::getOrderNumber)
                .containsExactly(tuple("Renamed third", 1), tuple("First", 2), tuple("Second", 3));
    }

    private DefaultRecommendation create(String name, int orderNumber) {
        DefaultRecommendation recommendation = new DefaultRecommendation();
        recommendation.setName(name);
        recommendation.setAlcoholTypeId(1);
        recommendation.setColorPaletteId(3);
        recommendation.setGlasswareId(1);
        recommendation.setOrderNumber(orderNumber);
        return recommendation;
    }
}

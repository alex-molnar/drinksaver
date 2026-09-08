package com.drinksaver.repository.postgres.schema;

import com.drinksaver.model.db.SavedDrink;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for SavedDrinksTable derived queries.
 */
class SavedDrinksTableIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final UUID USER = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID OTHER = UUID.fromString("00000000-0000-0000-0000-000000000002");

    @Autowired
    private SavedDrinksTable savedDrinksTable;

    @Test
    void findByUserIdReturnsOnlyUserDrinks() {
        savedDrinksTable.saveAll(List.of(
                new SavedDrink(USER, "2026-09-08", 1, 2, 3, null, null, null, null),
                new SavedDrink(OTHER, "2026-09-08", 1, 2, 3, null, null, null, null)
        ));

        List<SavedDrink> result = savedDrinksTable.findByUserId(USER);

        assertThat(result).hasSize(1);
        assertThat(result).allSatisfy(d -> assertThat(d.getUserId()).isEqualTo(USER));
    }

    @Test
    void findByUserIdAndDateReturnsOnlyMatchingDate() {
        savedDrinksTable.saveAll(List.of(
                new SavedDrink(USER, "2026-09-08", 1, 2, 3, null, null, null, null),
                new SavedDrink(USER, "2026-09-07", 1, 2, 3, null, null, null, null),
                new SavedDrink(OTHER, "2026-09-08", 1, 2, 3, null, null, null, null)
        ));

        List<SavedDrink> result = savedDrinksTable.findByUserIdAndDate(USER, "2026-09-08");

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getDate()).isEqualTo("2026-09-08");
        assertThat(result).allSatisfy(d -> assertThat(d.getUserId()).isEqualTo(USER));
    }

    @Test
    void deleteAndCountByIdsReturnsDeletedCount() {
        SavedDrink drink1 = savedDrinksTable.save(new SavedDrink(USER, "2026-09-08", 1, 2, 3, null, null, null, null));
        SavedDrink drink2 = savedDrinksTable.save(new SavedDrink(USER, "2026-09-08", 1, 2, 3, null, null, null, null));
        SavedDrink drink3 = savedDrinksTable.save(new SavedDrink(OTHER, "2026-09-08", 1, 2, 3, null, null, null, null));

        int deleted = savedDrinksTable.deleteAndCountByIds(List.of(drink1.getId(), drink2.getId()));

        assertThat(deleted).isEqualTo(2);
        assertThat(savedDrinksTable.count()).isEqualTo(1);
    }

    @Test
    void deleteAndCountByIdsReturnsZeroWhenNoMatch() {
        int deleted = savedDrinksTable.deleteAndCountByIds(List.of(999, 1000, 1001));

        assertThat(deleted).isEqualTo(0);
    }
}

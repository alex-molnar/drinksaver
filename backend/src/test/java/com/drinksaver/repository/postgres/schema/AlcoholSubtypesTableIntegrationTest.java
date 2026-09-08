package com.drinksaver.repository.postgres.schema;

import com.drinksaver.model.db.AlcoholSubtype;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for AlcoholSubtypesTable. Tests ordering and user filtering.
 */
class AlcoholSubtypesTableIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final UUID USER = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID OTHER = UUID.fromString("00000000-0000-0000-0000-000000000002");

    @Autowired
    private AlcoholSubtypesTable subtypesTable;

    @Test
    void findAllByAlcoholTypeIdAndUserIdInFiltersAndOrders() {
        subtypesTable.saveAll(List.of(
                new AlcoholSubtype(1, USER, "Premium"),
                new AlcoholSubtype(1, OTHER, "Standard"),
                new AlcoholSubtype(1, USER, "Aged"),
                new AlcoholSubtype(2, USER, "Dark")
        ));

        List<AlcoholSubtype> result = subtypesTable.findAllByAlcoholTypeIdAndUserIdInOrderByNameAsc(1, List.of(USER));

        assertThat(result).hasSize(2);
        assertThat(result).extracting(AlcoholSubtype::getName).containsExactly("Aged", "Premium");
        assertThat(result).allSatisfy(s -> assertThat(s.getUserId()).isEqualTo(USER));
    }

    @Test
    void findAllByAlcoholTypeIdAndUserIdInReturnsEmptyForUnknownType() {
        subtypesTable.save(new AlcoholSubtype(1, USER, "Premium"));

        List<AlcoholSubtype> result = subtypesTable.findAllByAlcoholTypeIdAndUserIdInOrderByNameAsc(999, List.of(USER));

        assertThat(result).isEmpty();
    }
}

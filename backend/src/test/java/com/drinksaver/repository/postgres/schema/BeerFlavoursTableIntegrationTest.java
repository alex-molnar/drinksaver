package com.drinksaver.repository.postgres.schema;

import com.drinksaver.model.db.BeerFlavour;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for BeerFlavoursTable. Tests ordering and user filtering.
 */
class BeerFlavoursTableIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final UUID USER = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID OTHER = UUID.fromString("00000000-0000-0000-0000-000000000002");

    @Autowired
    private BeerFlavoursTable flavoursTable;

    @Test
    void findAllByBrandIdAndUserIdInFiltersAndOrders() {
        flavoursTable.saveAll(List.of(
                new BeerFlavour(1, USER, "IPA"),
                new BeerFlavour(1, OTHER, "Stout"),
                new BeerFlavour(1, USER, "Lager"),
                new BeerFlavour(2, USER, "Porter")
        ));

        List<BeerFlavour> result = flavoursTable.findAllByBrandIdAndUserIdIn(1, List.of(USER));

        assertThat(result).hasSize(2);
        assertThat(result).extracting(BeerFlavour::getName).containsExactly("IPA", "Lager");
        assertThat(result).allSatisfy(f -> assertThat(f.getUserId()).isEqualTo(USER));
    }

    @Test
    void findAllByBrandIdAndUserIdInReturnsEmptyForUnknownBrand() {
        flavoursTable.save(new BeerFlavour(1, USER, "IPA"));

        List<BeerFlavour> result = flavoursTable.findAllByBrandIdAndUserIdIn(999, List.of(USER));

        assertThat(result).isEmpty();
    }
}

package com.drinksaver.repository.postgres.schema;

import com.drinksaver.model.db.AlcoholType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for AlcoholTypesTable. Tests that the integer[] volume_ids
 * column round-trips correctly, which is the custom JPA mapping most likely to
 * break silently.
 */
class AlcoholTypesTableIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final UUID USER = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Autowired
    private AlcoholTypesTable alcoholTypesTable;

    @Test
    void volumeIdsArrayRoundTrips() {
        AlcoholType type = new AlcoholType(USER, "Vodka", List.of(1, 2, 3));
        alcoholTypesTable.save(type);

        Optional<AlcoholType> result = alcoholTypesTable.findById(type.getId());

        assertThat(result).isPresent();
        assertThat(result.get().getVolumeIds()).containsExactly(1, 2, 3);
    }

    @Test
    void emptyVolumeIdsArrayRoundTrips() {
        AlcoholType type = new AlcoholType(USER, "Vodka", List.of());
        alcoholTypesTable.save(type);

        Optional<AlcoholType> result = alcoholTypesTable.findById(type.getId());

        assertThat(result).isPresent();
        assertThat(result.get().getVolumeIds()).isEmpty();
    }

    @Test
    void findAllByUserIdInOrderByNameAscOrdersCorrectly() {
        alcoholTypesTable.saveAll(List.of(
                new AlcoholType(USER, "Whiskey", List.of()),
                new AlcoholType(USER, "Vodka", List.of()),
                new AlcoholType(USER, "Gin", List.of())
        ));

        List<AlcoholType> result = alcoholTypesTable.findAllByUserIdInOrderByNameAsc(List.of(USER));

        assertThat(result).extracting(AlcoholType::getName).containsExactly("Gin", "Vodka", "Whiskey");
    }
}

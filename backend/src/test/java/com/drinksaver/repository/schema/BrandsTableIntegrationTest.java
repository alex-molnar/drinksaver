package com.drinksaver.repository.schema;

import com.drinksaver.model.db.Brand;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for BrandsTable derived queries. Tests that real Postgres
 * correctly implements the ORDER BY name and user ID filtering logic.
 */
class BrandsTableIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final UUID ADMIN = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID USER = UUID.fromString("00000000-0000-0000-0000-000000000002");
    private static final UUID OTHER = UUID.fromString("00000000-0000-0000-0000-000000000003");

    @Autowired
    private BrandsTable brandsTable;

    @Test
    void findAllByUserIdInReturnsOnlyTheRequestedUsersOrderedByName() {
        brandsTable.saveAll(List.of(
                new Brand(USER, "Zywiec", null),
                new Brand(ADMIN, "Asahi", null),
                new Brand(USER, "Meantime", null),
                new Brand(OTHER, "Peroni", null)
        ));

        List<Brand> result = brandsTable.findAllByUserIdInOrderByName(List.of(ADMIN, USER));

        assertThat(result).extracting(Brand::getName).containsExactly("Asahi", "Meantime", "Zywiec");
        assertThat(result).extracting(Brand::getUserId).doesNotContain(OTHER);
    }

    @Test
    void findAllByUserIdInReturnsEmptyForAnUnknownUser() {
        brandsTable.saveAll(List.of(new Brand(ADMIN, "Asahi", null)));

        assertThat(brandsTable.findAllByUserIdInOrderByName(List.of(OTHER))).isEmpty();
    }
}

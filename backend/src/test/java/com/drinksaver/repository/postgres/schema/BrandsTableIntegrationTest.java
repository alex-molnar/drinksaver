package com.drinksaver.repository.postgres.schema;

import com.drinksaver.model.db.Brand;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The pattern every integration test in this codebase should copy.
 *
 * disabledWithoutDocker means a machine with no Docker running skips these
 * rather than failing the build. CI runners always have Docker, so coverage is
 * not lost where it counts.
 */
@DataJpaTest
@Testcontainers(disabledWithoutDocker = true)
class BrandsTableIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine");

    private static final UUID ADMIN = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID USER = UUID.fromString("00000000-0000-0000-0000-000000000002");
    private static final UUID OTHER = UUID.fromString("00000000-0000-0000-0000-000000000003");

    @Autowired
    private BrandsTable brandsTable;

    @Test
    void findAllByUserIdInReturnsOnlyTheRequestedUsersOrderedByName() {
        brandsTable.saveAll(List.of(
                new Brand(USER, "Zywiec"),
                new Brand(ADMIN, "Asahi"),
                new Brand(USER, "Meantime"),
                new Brand(OTHER, "Peroni")
        ));

        List<Brand> result = brandsTable.findAllByUserIdInOrderByName(List.of(ADMIN, USER));

        assertThat(result).extracting(Brand::getName).containsExactly("Asahi", "Meantime", "Zywiec");
        assertThat(result).extracting(Brand::getUserId).doesNotContain(OTHER);
    }

    @Test
    void findAllByUserIdInReturnsEmptyForAnUnknownUser() {
        brandsTable.saveAll(List.of(new Brand(ADMIN, "Asahi")));

        assertThat(brandsTable.findAllByUserIdInOrderByName(List.of(OTHER))).isEmpty();
    }
}

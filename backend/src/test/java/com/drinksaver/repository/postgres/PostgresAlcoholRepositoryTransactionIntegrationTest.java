package com.drinksaver.repository.postgres;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.dto.NewAlcoholEntry;
import com.drinksaver.model.dto.NewVolumeEntry;
import com.drinksaver.repository.postgres.schema.AlcoholSubtypesTable;
import com.drinksaver.repository.postgres.schema.AlcoholTypesTable;
import com.drinksaver.repository.postgres.schema.AlcoholVolumeTable;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatRuntimeException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * F8. `createAlcoholType` writes volumes, then the type, then the subtypes. It carried a
 * `// TODO in transaction`, and without one a failure part way through left orphaned volume
 * rows and a type with no subtypes. Only a real database can show that, so this is the one
 * place the rollback is actually proven rather than asserted against mocks.
 *
 * Three details make the test mean what it says:
 *
 * - The class does not extend {@link com.drinksaver.repository.postgres.schema.AbstractPostgresIntegrationTest}
 *   because it needs its own {@code @Import} of the repository under test, and because it has
 *   to opt out of the surrounding test transaction. It still shares the same container image
 *   and the same {@code disabledWithoutDocker} behaviour.
 * - {@code @Transactional(propagation = NOT_SUPPORTED)}. {@code @DataJpaTest} wraps each test
 *   in a transaction that rolls back at the end, which would make a rollback assertion pass
 *   whether or not the code under test has {@code @Transactional} at all. Suspending it is
 *   what gives the assertion any force.
 * - {@code AlcoholSubtypesTable} is mocked to throw. Provoking a real constraint violation on
 *   the last write would work too, but the schema comes from ddl-auto with nothing to violate,
 *   and the point being tested is the rollback boundary, not any particular database error.
 *
 * The flip side of suspending the transaction is that whatever commits stays committed, so the
 * tests cannot share a user and cannot assert an absolute row count. Each takes its own userId
 * and the volume assertions are deltas.
 */
@DataJpaTest
@Testcontainers(disabledWithoutDocker = true)
@Import(PostgresAlcoholRepository.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class PostgresAlcoholRepositoryTransactionIntegrationTest {

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    private static final UUID COMMITTING_USER = UUID.fromString("00000000-0000-0000-0000-000000000042");
    private static final UUID ROLLING_BACK_USER = UUID.fromString("00000000-0000-0000-0000-000000000043");

    @Autowired
    private PostgresAlcoholRepository repository;

    @Autowired
    private AlcoholTypesTable alcoholTypesTable;

    @Autowired
    private AlcoholVolumeTable alcoholVolumeTable;

    @MockitoBean
    private AlcoholSubtypesTable alcoholSubtypesTable;

    @MockitoBean
    private RepositoryConfiguration repositoryConfiguration;

    @Test
    void createAlcoholTypeCommitsTheTypeAndItsVolumesTogether() {
        NewAlcoholEntry entry = new NewAlcoholEntry(
            COMMITTING_USER, "Gin", List.of(new NewVolumeEntry("Shot", 0.05f)), List.of("London Dry")
        );
        when(alcoholSubtypesTable.saveAll(any())).thenReturn(List.of());
        long volumesBefore = alcoholVolumeTable.count();

        repository.createAlcoholType(entry);

        assertThat(alcoholTypesTable.findAllByUserIdInOrderByNameAsc(List.of(COMMITTING_USER)))
            .singleElement()
            .satisfies(type -> {
                assertThat(type.getName()).isEqualTo("Gin");
                assertThat(type.getVolumeIds()).hasSize(1);
            });
        assertThat(alcoholVolumeTable.count()).isEqualTo(volumesBefore + 1);
    }

    @Test
    void createAlcoholTypeRollsBackTheVolumesAndTheTypeWhenTheSubtypesFail() {
        NewAlcoholEntry entry = new NewAlcoholEntry(
            ROLLING_BACK_USER, "Rum", List.of(new NewVolumeEntry("Shot", 0.05f)), List.of("Spiced")
        );
        when(alcoholSubtypesTable.saveAll(any()))
            .thenThrow(new IllegalStateException("subtype write failed"));
        long volumesBefore = alcoholVolumeTable.count();

        assertThatRuntimeException().isThrownBy(() -> repository.createAlcoholType(entry));

        assertThat(alcoholTypesTable.findAllByUserIdInOrderByNameAsc(List.of(ROLLING_BACK_USER))).isEmpty();
        assertThat(alcoholVolumeTable.count()).isEqualTo(volumesBefore);
    }
}

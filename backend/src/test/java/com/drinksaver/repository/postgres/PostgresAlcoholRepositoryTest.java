package com.drinksaver.repository.postgres;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.AlcoholSubtype;
import com.drinksaver.model.db.AlcoholType;
import com.drinksaver.model.db.AlcoholVolume;
import com.drinksaver.model.dto.NewAlcoholEntry;
import com.drinksaver.model.dto.NewAlcoholSubtype;
import com.drinksaver.model.dto.NewVolumeEntry;
import com.drinksaver.repository.postgres.schema.AlcoholSubtypesTable;
import com.drinksaver.repository.postgres.schema.AlcoholTypesTable;
import com.drinksaver.repository.postgres.schema.AlcoholVolumeTable;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class PostgresAlcoholRepositoryTest {

    private static final UUID USER = UUID.randomUUID();
    private static final UUID ADMIN = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private RepositoryConfiguration configWithAdmins(List<UUID> admins) {
        return new RepositoryConfiguration(
                "postgres", "postgres", "postgres", "postgres",
                admins, 4, 10, 0.97
        );
    }

    @Test
    void isReturnsTrueForPostgres() {
        PostgresAlcoholRepository repo = new PostgresAlcoholRepository(
                mock(AlcoholTypesTable.class),
                mock(AlcoholSubtypesTable.class),
                mock(AlcoholVolumeTable.class),
                configWithAdmins(List.of())
        );

        assertThat(repo.is("postgres")).isTrue();
        assertThat(repo.is("Postgres")).isTrue();
        assertThat(repo.is("POSTGRES")).isTrue();
        assertThat(repo.is("mysql")).isFalse();
    }

    @Test
    void getAlcoholTypesIncludesAdminAndCallerIds() {
        AlcoholTypesTable typesTable = mock(AlcoholTypesTable.class);
        when(typesTable.findAllByUserIdInOrderByNameAsc(any())).thenReturn(List.of());

        PostgresAlcoholRepository repo = new PostgresAlcoholRepository(
                typesTable,
                mock(AlcoholSubtypesTable.class),
                mock(AlcoholVolumeTable.class),
                configWithAdmins(List.of(ADMIN))
        );

        repo.getAlcoholTypes(USER);

        ArgumentCaptor<List<UUID>> captor = ArgumentCaptor.forClass(List.class);
        verify(typesTable).findAllByUserIdInOrderByNameAsc(captor.capture());

        assertThat(captor.getValue()).containsExactly(ADMIN, USER);
    }

    @Test
    void getAlcoholTypesReturnsTableResults() {
        AlcoholType type = new AlcoholType(ADMIN, "Beer", List.of());
        AlcoholTypesTable typesTable = mock(AlcoholTypesTable.class);
        when(typesTable.findAllByUserIdInOrderByNameAsc(any())).thenReturn(List.of(type));

        PostgresAlcoholRepository repo = new PostgresAlcoholRepository(
                typesTable,
                mock(AlcoholSubtypesTable.class),
                mock(AlcoholVolumeTable.class),
                configWithAdmins(List.of(ADMIN))
        );

        List<AlcoholType> result = repo.getAlcoholTypes(USER);

        assertThat(result).containsExactly(type);
    }

    @Test
    void getSubtypesByAlcoholTypeIncludesAdminAndCallerIds() {
        AlcoholSubtypesTable subtypesTable = mock(AlcoholSubtypesTable.class);
        when(subtypesTable.findAllByAlcoholTypeIdAndUserIdInOrderByNameAsc(anyInt(), any())).thenReturn(List.of());

        PostgresAlcoholRepository repo = new PostgresAlcoholRepository(
                mock(AlcoholTypesTable.class),
                subtypesTable,
                mock(AlcoholVolumeTable.class),
                configWithAdmins(List.of(ADMIN))
        );

        repo.getSubtypesByAlcoholType(1, USER);

        ArgumentCaptor<List<UUID>> captor = ArgumentCaptor.forClass(List.class);
        verify(subtypesTable).findAllByAlcoholTypeIdAndUserIdInOrderByNameAsc(anyInt(), captor.capture());

        assertThat(captor.getValue()).containsExactly(ADMIN, USER);
    }

    @Test
    void saveSubtypeForAlcoholTypeSavesWithCorrectFields() {
        AlcoholSubtypesTable subtypesTable = mock(AlcoholSubtypesTable.class);
        AlcoholSubtype saved = new AlcoholSubtype(1, USER, "Pale Ale");
        when(subtypesTable.save(any())).thenReturn(saved);

        PostgresAlcoholRepository repo = new PostgresAlcoholRepository(
                mock(AlcoholTypesTable.class),
                subtypesTable,
                mock(AlcoholVolumeTable.class),
                configWithAdmins(List.of())
        );

        AlcoholSubtype result = repo.saveSubtypeForAlcoholType(1, new NewAlcoholSubtype(1, USER, "Pale Ale"));

        assertThat(result).isEqualTo(saved);
        ArgumentCaptor<AlcoholSubtype> captor = ArgumentCaptor.forClass(AlcoholSubtype.class);
        verify(subtypesTable).save(captor.capture());
        assertThat(captor.getValue().getAlcoholTypeId()).isEqualTo(1);
        assertThat(captor.getValue().getUserId()).isEqualTo(USER);
        assertThat(captor.getValue().getName()).isEqualTo("Pale Ale");
    }

    @Test
    void getVolumesByAlcoholTypeReturnsEmptyWhenTypeNotFound() {
        AlcoholTypesTable typesTable = mock(AlcoholTypesTable.class);
        when(typesTable.findById(1)).thenReturn(Optional.empty());

        PostgresAlcoholRepository repo = new PostgresAlcoholRepository(
                typesTable,
                mock(AlcoholSubtypesTable.class),
                mock(AlcoholVolumeTable.class),
                configWithAdmins(List.of())
        );

        List<AlcoholVolume> result = repo.getVolumesByAlcoholType(1);

        assertThat(result).isEmpty();
    }

    @Test
    void getVolumesByAlcoholTypeReturnsVolumesForExistingType() {
        AlcoholVolume volume = new AlcoholVolume(1, "Pint", 0.568f);
        AlcoholType type = new AlcoholType(ADMIN, "Beer", List.of(1));
        AlcoholTypesTable typesTable = mock(AlcoholTypesTable.class);
        when(typesTable.findById(1)).thenReturn(Optional.of(type));

        AlcoholVolumeTable volumeTable = mock(AlcoholVolumeTable.class);
        when(volumeTable.findAllById(List.of(1))).thenReturn(List.of(volume));

        PostgresAlcoholRepository repo = new PostgresAlcoholRepository(
                typesTable,
                mock(AlcoholSubtypesTable.class),
                volumeTable,
                configWithAdmins(List.of())
        );

        List<AlcoholVolume> result = repo.getVolumesByAlcoholType(1);

        assertThat(result).containsExactly(volume);
    }

    /**
     * F7. An unknown alcohol type used to yield an all-null AlcoholVolume, so the caller
     * got a 200 and could not tell success from failure. An empty Optional lets the
     * controller answer 404 instead.
     */
    @Test
    void saveVolumeForAlcoholTypeReturnsEmptyForAnUnknownType() {
        AlcoholTypesTable typesTable = mock(AlcoholTypesTable.class);
        when(typesTable.findById(99)).thenReturn(Optional.empty());

        AlcoholVolumeTable volumeTable = mock(AlcoholVolumeTable.class);

        PostgresAlcoholRepository repo = new PostgresAlcoholRepository(
                typesTable,
                mock(AlcoholSubtypesTable.class),
                volumeTable,
                configWithAdmins(List.of())
        );

        Optional<AlcoholVolume> result = repo.saveVolumeForAlcoholType(99, new NewVolumeEntry("Shot", 0.05f));

        assertThat(result).isEmpty();
        verifyNoInteractions(volumeTable);
    }

    @Test
    void saveVolumeForAlcoholTypeAttachesTheNewVolumeToTheType() {
        AlcoholType type = new AlcoholType(ADMIN, "Vodka", new java.util.ArrayList<>(List.of(7)));
        AlcoholTypesTable typesTable = mock(AlcoholTypesTable.class);
        when(typesTable.findById(1)).thenReturn(Optional.of(type));

        AlcoholVolume saved = new AlcoholVolume(1, "Shot", 0.05f);
        saved.setId(8);
        AlcoholVolumeTable volumeTable = mock(AlcoholVolumeTable.class);
        when(volumeTable.save(any())).thenReturn(saved);

        PostgresAlcoholRepository repo = new PostgresAlcoholRepository(
                typesTable,
                mock(AlcoholSubtypesTable.class),
                volumeTable,
                configWithAdmins(List.of())
        );

        Optional<AlcoholVolume> result = repo.saveVolumeForAlcoholType(1, new NewVolumeEntry("Shot", 0.05f));

        assertThat(result).contains(saved);
        ArgumentCaptor<AlcoholType> captor = ArgumentCaptor.forClass(AlcoholType.class);
        verify(typesTable).save(captor.capture());
        assertThat(captor.getValue().getVolumeIds()).containsExactly(7, 8);
    }

    @Test
    void createAlcoholTypeWithNoVolumesOrSubtypesWritesJustTheType() {
        AlcoholType saved = new AlcoholType(USER, "Gin", List.of());
        AlcoholTypesTable typesTable = mock(AlcoholTypesTable.class);
        when(typesTable.save(any())).thenReturn(saved);

        AlcoholVolumeTable volumeTable = mock(AlcoholVolumeTable.class);
        AlcoholSubtypesTable subtypesTable = mock(AlcoholSubtypesTable.class);

        PostgresAlcoholRepository repo = new PostgresAlcoholRepository(
                typesTable,
                subtypesTable,
                volumeTable,
                configWithAdmins(List.of())
        );

        AlcoholType result = repo.createAlcoholType(new NewAlcoholEntry(USER, "Gin", null, null));

        assertThat(result).isEqualTo(saved);
        verifyNoInteractions(volumeTable, subtypesTable);
    }
}

package com.drinksaver.repository.postgres;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.AlcoholSubtype;
import com.drinksaver.model.db.AlcoholType;
import com.drinksaver.model.db.AlcoholVolume;
import com.drinksaver.model.dto.patch.UpdateAlcoholSubtype;
import com.drinksaver.model.dto.patch.UpdateAlcoholType;
import com.drinksaver.model.dto.post.NewAlcoholEntry;
import com.drinksaver.model.dto.post.NewAlcoholSubtype;
import com.drinksaver.model.dto.post.NewVolumeEntry;
import com.drinksaver.repository.AlcoholRepository;
import com.drinksaver.repository.schema.AlcoholSubtypesTable;
import com.drinksaver.repository.schema.AlcoholTypesTable;
import com.drinksaver.repository.schema.AlcoholVolumeTable;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class AlcoholRepositoryTest {

    @Test
    void createsDefaultAlcoholTypeAndNestedSubtypesWithConfiguredAdminOwnership() {
        AlcoholTypesTable types = mock(AlcoholTypesTable.class);
        AlcoholSubtypesTable subtypes = mock(AlcoholSubtypesTable.class);
        AlcoholVolumeTable volumes = mock(AlcoholVolumeTable.class);
        when(types.save(any())).thenAnswer(invocation -> {
            AlcoholType type = invocation.getArgument(0);
            type.setId(7);
            return type;
        });
        AlcoholVolume volume = new AlcoholVolume(8, "Glass", 0.15f);
        when(volumes.save(any())).thenReturn(volume);
        AlcoholRepository repository = new AlcoholRepository(types, subtypes, volumes, CONFIG);

        AlcoholType result = repository.createAdminAlcoholType(new NewAlcoholEntry(
            USER, "Wine", List.of(new NewVolumeEntry("Glass", 0.15f)), List.of("Dry"), 2, 3));

        assertThat(result.getUserId()).isEqualTo(ADMIN);
        assertThat(result.getName()).isEqualTo("Wine");
        assertThat(result.getVolumeIds()).containsExactly(8);
        assertThat(result.getColorPaletteId()).isEqualTo(2);
        assertThat(result.getGlasswareId()).isEqualTo(3);
        ArgumentCaptor<Iterable<AlcoholSubtype>> captor = ArgumentCaptor.captor();
        verify(subtypes).saveAll(captor.capture());
        assertThat(captor.getValue()).singleElement().satisfies(subtype -> {
            assertThat(subtype.getAlcoholTypeId()).isEqualTo(7);
            assertThat(subtype.getUserId()).isEqualTo(ADMIN);
            assertThat(subtype.getName()).isEqualTo("Dry");
        });
    }

    @Test
    void createsDefaultSubtypeWithConfiguredAdminOwnershipAndPathParent() {
        AlcoholSubtypesTable subtypes = mock(AlcoholSubtypesTable.class);
        when(subtypes.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        AlcoholRepository repository = new AlcoholRepository(mock(AlcoholTypesTable.class), subtypes,
            mock(AlcoholVolumeTable.class), CONFIG);

        AlcoholSubtype result = repository.saveAdminSubtypeForAlcoholType(7,
            new NewAlcoholSubtype(99, USER, "Dry", 2, 3));

        assertThat(result.getAlcoholTypeId()).isEqualTo(7);
        assertThat(result.getUserId()).isEqualTo(ADMIN);
        assertThat(result.getName()).isEqualTo("Dry");
        assertThat(result.getColorPaletteId()).isEqualTo(2);
        assertThat(result.getGlasswareId()).isEqualTo(3);
    }

    private static final UUID USER = UUID.randomUUID();
    private static final UUID ADMIN = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final RepositoryConfiguration CONFIG = new RepositoryConfiguration(
            "postgres", "postgres", "postgres", "postgres", "postgres",
            ADMIN, 4, 10, 0.97
    );

    @Test
    void getAlcoholTypesIncludesAdminAndCallerIds() {
        AlcoholTypesTable typesTable = mock(AlcoholTypesTable.class);
        when(typesTable.findAllByUserIdInOrderByNameAsc(any())).thenReturn(List.of());

        AlcoholRepository repo = new AlcoholRepository(
                typesTable,
                mock(AlcoholSubtypesTable.class),
                mock(AlcoholVolumeTable.class),
                CONFIG
        );

        repo.getAlcoholTypes(USER);

        ArgumentCaptor<List<UUID>> captor = ArgumentCaptor.forClass(List.class);
        verify(typesTable).findAllByUserIdInOrderByNameAsc(captor.capture());

        assertThat(captor.getValue()).containsExactlyInAnyOrder(ADMIN, USER);
    }

    @Test
    void getAlcoholTypesReturnsTableResults() {
        AlcoholType type = new AlcoholType(ADMIN, "Beer", List.of(), null, null);
        AlcoholTypesTable typesTable = mock(AlcoholTypesTable.class);
        when(typesTable.findAllByUserIdInOrderByNameAsc(any())).thenReturn(List.of(type));

        AlcoholRepository repo = new AlcoholRepository(
                typesTable,
                mock(AlcoholSubtypesTable.class),
                mock(AlcoholVolumeTable.class),
                CONFIG
        );

        List<AlcoholType> result = repo.getAlcoholTypes(USER);

        assertThat(result).containsExactly(type);
    }

    @Test
    void getSubtypesByAlcoholTypeIncludesAdminAndCallerIds() {
        AlcoholSubtypesTable subtypesTable = mock(AlcoholSubtypesTable.class);
        when(subtypesTable.findAllByAlcoholTypeIdAndUserIdInOrderByNameAsc(anyInt(), any())).thenReturn(List.of());

        AlcoholRepository repo = new AlcoholRepository(
                mock(AlcoholTypesTable.class),
                subtypesTable,
                mock(AlcoholVolumeTable.class),
                CONFIG
        );

        repo.getSubtypesByAlcoholType(1, USER);

        ArgumentCaptor<List<UUID>> captor = ArgumentCaptor.forClass(List.class);
        verify(subtypesTable).findAllByAlcoholTypeIdAndUserIdInOrderByNameAsc(anyInt(), captor.capture());

        assertThat(captor.getValue()).containsExactlyInAnyOrder(ADMIN, USER);
    }

    @Test
    void saveSubtypeForAlcoholTypeSavesWithCorrectFields() {
        AlcoholSubtypesTable subtypesTable = mock(AlcoholSubtypesTable.class);
        AlcoholSubtype saved = new AlcoholSubtype(1, USER, "Pale Ale");
        when(subtypesTable.save(any())).thenReturn(saved);

        AlcoholRepository repo = new AlcoholRepository(
                mock(AlcoholTypesTable.class),
                subtypesTable,
                mock(AlcoholVolumeTable.class),
                CONFIG
        );

        AlcoholSubtype result = repo.saveSubtypeForAlcoholType(1, new NewAlcoholSubtype(1, USER, "Pale Ale", null, null));

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

        AlcoholRepository repo = new AlcoholRepository(
                typesTable,
                mock(AlcoholSubtypesTable.class),
                mock(AlcoholVolumeTable.class),
                CONFIG
        );

        List<AlcoholVolume> result = repo.getVolumesByAlcoholType(1);

        assertThat(result).isEmpty();
    }

    @Test
    void getVolumesByAlcoholTypeReturnsVolumesForExistingType() {
        AlcoholVolume volume = new AlcoholVolume(1, "Pint", 0.568f);
        AlcoholType type = new AlcoholType(ADMIN, "Beer", List.of(1), null, null);
        AlcoholTypesTable typesTable = mock(AlcoholTypesTable.class);
        when(typesTable.findById(1)).thenReturn(Optional.of(type));

        AlcoholVolumeTable volumeTable = mock(AlcoholVolumeTable.class);
        when(volumeTable.findAllById(List.of(1))).thenReturn(List.of(volume));

        AlcoholRepository repo = new AlcoholRepository(
                typesTable,
                mock(AlcoholSubtypesTable.class),
                volumeTable,
                CONFIG
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

        AlcoholRepository repo = new AlcoholRepository(
                typesTable,
                mock(AlcoholSubtypesTable.class),
                volumeTable,
                CONFIG
        );

        Optional<AlcoholVolume> result = repo.saveVolumeForAlcoholType(99, USER, new NewVolumeEntry("Shot", 0.05f));

        assertThat(result).isEmpty();
        verifyNoInteractions(volumeTable);
    }

    @Test
    void saveVolumeForAlcoholTypeAttachesTheNewVolumeToTheType() {
        AlcoholType type = new AlcoholType(USER, "Vodka", new java.util.ArrayList<>(List.of(7)), null, null);
        AlcoholTypesTable typesTable = mock(AlcoholTypesTable.class);
        when(typesTable.findById(1)).thenReturn(Optional.of(type));

        AlcoholVolume saved = new AlcoholVolume(1, "Shot", 0.05f);
        saved.setId(8);
        AlcoholVolumeTable volumeTable = mock(AlcoholVolumeTable.class);
        when(volumeTable.save(any())).thenReturn(saved);

        AlcoholRepository repo = new AlcoholRepository(
                typesTable,
                mock(AlcoholSubtypesTable.class),
                volumeTable,
                CONFIG
        );

        Optional<AlcoholVolume> result = repo.saveVolumeForAlcoholType(1, USER, new NewVolumeEntry("Shot", 0.05f));

        assertThat(result).contains(saved);
        ArgumentCaptor<AlcoholType> captor = ArgumentCaptor.forClass(AlcoholType.class);
        verify(typesTable).save(captor.capture());
        assertThat(captor.getValue().getVolumeIds()).containsExactly(7, 8);
    }

    @Test
    void saveVolumeForAlcoholTypeReturnsEmptyWhenTypeBelongsToAnotherUser() {
        AlcoholType type = new AlcoholType(ADMIN, "Vodka", new java.util.ArrayList<>(List.of(7)), null, null);
        AlcoholTypesTable typesTable = mock(AlcoholTypesTable.class);
        when(typesTable.findById(1)).thenReturn(Optional.of(type));
        AlcoholVolumeTable volumeTable = mock(AlcoholVolumeTable.class);
        AlcoholRepository repo = new AlcoholRepository(
                typesTable,
                mock(AlcoholSubtypesTable.class),
                volumeTable,
                CONFIG
        );

        Optional<AlcoholVolume> result = repo.saveVolumeForAlcoholType(1, USER, new NewVolumeEntry("Shot", 0.05f));

        assertThat(result).isEmpty();
        verifyNoInteractions(volumeTable);
        verify(typesTable, never()).save(any());
    }

    @Test
    void createAlcoholTypeWithNoVolumesOrSubtypesWritesJustTheType() {
        AlcoholType saved = new AlcoholType(USER, "Gin", List.of(), null, null);
        AlcoholTypesTable typesTable = mock(AlcoholTypesTable.class);
        when(typesTable.save(any())).thenReturn(saved);

        AlcoholVolumeTable volumeTable = mock(AlcoholVolumeTable.class);
        AlcoholSubtypesTable subtypesTable = mock(AlcoholSubtypesTable.class);

        AlcoholRepository repo = new AlcoholRepository(
                typesTable,
                subtypesTable,
                volumeTable,
                CONFIG
        );

        AlcoholType result = repo.createAlcoholType(new NewAlcoholEntry(USER, "Gin", null, null, null, null));

        assertThat(result).isEqualTo(saved);
        verifyNoInteractions(volumeTable, subtypesTable);
    }

    @Test
    void editsAndPublishesAlcoholTypes() {
        AlcoholTypesTable typesTable = mock(AlcoholTypesTable.class);
        AlcoholType existing = new AlcoholType(USER, "Old", List.of(1), 2, 3);
        when(typesTable.findById(1)).thenReturn(Optional.of(existing));
        when(typesTable.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        AlcoholRepository repo = new AlcoholRepository(typesTable, mock(AlcoholSubtypesTable.class), mock(AlcoholVolumeTable.class), CONFIG);

        Optional<AlcoholType> edited = repo.editAlcoholType(1, new UpdateAlcoholType("New", List.of(4), 5, 6));
        assertThat(edited).contains(existing);
        assertThat(existing.getName()).isEqualTo("New");
        assertThat(existing.getVolumeIds()).containsExactly(4);
        assertThat(existing.getColorPaletteId()).isEqualTo(5);
        assertThat(existing.getGlasswareId()).isEqualTo(6);

        assertThat(repo.publishAlcoholType(1)).contains(existing);
        assertThat(existing.getUserId()).isEqualTo(ADMIN);
    }

    @Test
    void editsAndPublishesAlcoholSubtypes() {
        AlcoholSubtypesTable subtypesTable = mock(AlcoholSubtypesTable.class);
        AlcoholSubtype existing = new AlcoholSubtype(1, USER, "Old", 2, 3);
        when(subtypesTable.findById(1L)).thenReturn(Optional.of(existing));
        when(subtypesTable.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        AlcoholRepository repo = new AlcoholRepository(mock(AlcoholTypesTable.class), subtypesTable, mock(AlcoholVolumeTable.class), CONFIG);

        Optional<AlcoholSubtype> edited = repo.editAlcoholSubtype(1L, new UpdateAlcoholSubtype("New", 5, 6));
        assertThat(edited).contains(existing);
        assertThat(existing.getName()).isEqualTo("New");
        assertThat(existing.getColorPaletteId()).isEqualTo(5);
        assertThat(existing.getGlasswareId()).isEqualTo(6);

        assertThat(repo.publishAlcoholSubtype(1L)).contains(existing);
        assertThat(existing.getUserId()).isEqualTo(ADMIN);
    }
}

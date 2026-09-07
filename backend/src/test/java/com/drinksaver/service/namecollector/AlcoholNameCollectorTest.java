package com.drinksaver.service.namecollector;

import com.drinksaver.model.db.AlcoholSubtype;
import com.drinksaver.model.db.AlcoholType;
import com.drinksaver.model.db.AlcoholVolume;
import com.drinksaver.repository.postgres.schema.AlcoholSubtypesTable;
import com.drinksaver.repository.postgres.schema.AlcoholTypesTable;
import com.drinksaver.repository.postgres.schema.AlcoholVolumeTable;
import com.drinksaver.service.model.DrinkKey;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AlcoholNameCollectorTest {

    private static final UUID USER = UUID.randomUUID();

    @Test
    void collectsAlcoholTypeAndVolumeName() {
        AlcoholType type = new AlcoholType(USER, "Vodka", null);
        AlcoholVolume volume = new AlcoholVolume(1, "Shot", 0.05f);

        AlcoholTypesTable typesTable = mock(AlcoholTypesTable.class);
        when(typesTable.findById(1)).thenReturn(Optional.of(type));

        AlcoholVolumeTable volumeTable = mock(AlcoholVolumeTable.class);
        when(volumeTable.findById(2)).thenReturn(Optional.of(volume));

        AlcoholNameCollector collector = new AlcoholNameCollector(
                volumeTable,
                typesTable,
                mock(AlcoholSubtypesTable.class)
        );

        DrinkKey key = new DrinkKey(1, null, 2, null, null, null, Optional.empty());
        DrinkKey result = collector.collectAlcoholName(key);

        assertThat(result.name()).isPresent();
        assertThat(result.name().get()).contains("Vodka").contains("Shot").contains("0.05l");
    }

    @Test
    void collectsSubtypeNameWhenAvailable() {
        AlcoholSubtype subtype = new AlcoholSubtype(1, USER, "Premium Vodka");
        AlcoholVolume volume = new AlcoholVolume(1, "Shot", 0.05f);

        AlcoholSubtypesTable subtypesTable = mock(AlcoholSubtypesTable.class);
        when(subtypesTable.findById(3)).thenReturn(Optional.of(subtype));

        AlcoholVolumeTable volumeTable = mock(AlcoholVolumeTable.class);
        when(volumeTable.findById(2)).thenReturn(Optional.of(volume));

        AlcoholNameCollector collector = new AlcoholNameCollector(
                volumeTable,
                mock(AlcoholTypesTable.class),
                subtypesTable
        );

        DrinkKey key = new DrinkKey(1, 3, 2, null, null, null, Optional.empty());
        DrinkKey result = collector.collectAlcoholName(key);

        assertThat(result.name()).isPresent();
        assertThat(result.name().get()).contains("Premium Vodka");
    }

    @Test
    void fallsBackToTypeNameWhenSubtypeNotFound() {
        AlcoholType type = new AlcoholType(USER, "Vodka", null);
        AlcoholVolume volume = new AlcoholVolume(1, "Shot", 0.05f);

        AlcoholTypesTable typesTable = mock(AlcoholTypesTable.class);
        when(typesTable.findById(1)).thenReturn(Optional.of(type));

        AlcoholSubtypesTable subtypesTable = mock(AlcoholSubtypesTable.class);
        when(subtypesTable.findById(3)).thenReturn(Optional.empty());

        AlcoholVolumeTable volumeTable = mock(AlcoholVolumeTable.class);
        when(volumeTable.findById(2)).thenReturn(Optional.of(volume));

        AlcoholNameCollector collector = new AlcoholNameCollector(
                volumeTable,
                typesTable,
                subtypesTable
        );

        DrinkKey key = new DrinkKey(1, 3, 2, null, null, null, Optional.empty());
        DrinkKey result = collector.collectAlcoholName(key);

        assertThat(result.name()).isPresent();
        assertThat(result.name().get()).contains("Vodka");
    }

    @Test
    void usesUnknownAlcoholWhenTypeNotFound() {
        AlcoholVolume volume = new AlcoholVolume(1, "Shot", 0.05f);

        AlcoholTypesTable typesTable = mock(AlcoholTypesTable.class);
        when(typesTable.findById(1)).thenReturn(Optional.empty());

        AlcoholVolumeTable volumeTable = mock(AlcoholVolumeTable.class);
        when(volumeTable.findById(2)).thenReturn(Optional.of(volume));

        AlcoholNameCollector collector = new AlcoholNameCollector(
                volumeTable,
                typesTable,
                mock(AlcoholSubtypesTable.class)
        );

        DrinkKey key = new DrinkKey(1, null, 2, null, null, null, Optional.empty());
        DrinkKey result = collector.collectAlcoholName(key);

        assertThat(result.name()).isPresent();
        assertThat(result.name().get()).contains("Unknown alcohol");
    }

    @Test
    void usesUnknownAlcoholWhenTypeIdIsNull() {
        AlcoholVolume volume = new AlcoholVolume(1, "Shot", 0.05f);

        AlcoholVolumeTable volumeTable = mock(AlcoholVolumeTable.class);
        when(volumeTable.findById(2)).thenReturn(Optional.of(volume));

        AlcoholNameCollector collector = new AlcoholNameCollector(
                volumeTable,
                mock(AlcoholTypesTable.class),
                mock(AlcoholSubtypesTable.class)
        );

        DrinkKey key = new DrinkKey(null, null, 2, null, null, null, Optional.empty());
        DrinkKey result = collector.collectAlcoholName(key);

        assertThat(result.name()).isPresent();
        assertThat(result.name().get()).contains("Unknown alcohol");
    }

    @Test
    void usesUnknownVolumeWhenVolumeNotFound() {
        AlcoholType type = new AlcoholType(USER, "Vodka", null);

        AlcoholTypesTable typesTable = mock(AlcoholTypesTable.class);
        when(typesTable.findById(1)).thenReturn(Optional.of(type));

        AlcoholVolumeTable volumeTable = mock(AlcoholVolumeTable.class);
        when(volumeTable.findById(2)).thenReturn(Optional.empty());

        AlcoholNameCollector collector = new AlcoholNameCollector(
                volumeTable,
                typesTable,
                mock(AlcoholSubtypesTable.class)
        );

        DrinkKey key = new DrinkKey(1, null, 2, null, null, null, Optional.empty());
        DrinkKey result = collector.collectAlcoholName(key);

        assertThat(result.name()).isPresent();
        assertThat(result.name().get()).contains("Vodka").contains("Unknown volume");
    }
}

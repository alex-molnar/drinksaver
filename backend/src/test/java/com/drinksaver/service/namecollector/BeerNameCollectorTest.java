package com.drinksaver.service.namecollector;

import com.drinksaver.model.db.AlcoholVolume;
import com.drinksaver.model.db.BeerFlavour;
import com.drinksaver.model.db.Brand;
import com.drinksaver.model.db.ConsumptionType;
import com.drinksaver.repository.postgres.schema.AlcoholVolumeTable;
import com.drinksaver.repository.postgres.schema.BeerFlavoursTable;
import com.drinksaver.repository.postgres.schema.BrandsTable;
import com.drinksaver.repository.postgres.schema.ConsumptionTypesTable;
import com.drinksaver.service.model.DrinkKey;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class BeerNameCollectorTest {

    private static final UUID USER = UUID.randomUUID();

    @Test
    void collectsBrandAndVolumeOnly() {
        Brand brand = new Brand(USER, "Heineken");
        AlcoholVolume volume = new AlcoholVolume(1, "Pint", 0.568f);

        BrandsTable brandsTable = mock(BrandsTable.class);
        when(brandsTable.findById(1)).thenReturn(Optional.of(brand));

        AlcoholVolumeTable volumeTable = mock(AlcoholVolumeTable.class);
        when(volumeTable.findById(2)).thenReturn(Optional.of(volume));

        BeerNameCollector collector = new BeerNameCollector(
                volumeTable,
                mock(ConsumptionTypesTable.class),
                brandsTable,
                mock(BeerFlavoursTable.class)
        );

        DrinkKey key = new DrinkKey(4, null, 2, 1, null, null, Optional.empty());
        DrinkKey result = collector.collectBeerName(key);

        assertThat(result.name()).isPresent();
        assertThat(result.name().get()).contains("Heineken").contains("0.57l");
    }

    @Test
    void collectsBrandFlavourAndVolume() {
        Brand brand = new Brand(USER, "Heineken");
        BeerFlavour flavour = new BeerFlavour(1, USER, "Premium");
        AlcoholVolume volume = new AlcoholVolume(1, "Pint", 0.568f);

        BrandsTable brandsTable = mock(BrandsTable.class);
        when(brandsTable.findById(1)).thenReturn(Optional.of(brand));

        BeerFlavoursTable flavoursTable = mock(BeerFlavoursTable.class);
        when(flavoursTable.findById(3)).thenReturn(Optional.of(flavour));

        AlcoholVolumeTable volumeTable = mock(AlcoholVolumeTable.class);
        when(volumeTable.findById(2)).thenReturn(Optional.of(volume));

        BeerNameCollector collector = new BeerNameCollector(
                volumeTable,
                mock(ConsumptionTypesTable.class),
                brandsTable,
                flavoursTable
        );

        DrinkKey key = new DrinkKey(4, null, 2, 1, 3, null, Optional.empty());
        DrinkKey result = collector.collectBeerName(key);

        assertThat(result.name()).isPresent();
        assertThat(result.name().get()).contains("Heineken").contains("Premium");
    }

    @Test
    void collectsWithConsumptionType() {
        Brand brand = new Brand(USER, "Heineken");
        ConsumptionType consumption = new ConsumptionType(1, "Draught");
        AlcoholVolume volume = new AlcoholVolume(1, "Pint", 0.568f);

        BrandsTable brandsTable = mock(BrandsTable.class);
        when(brandsTable.findById(1)).thenReturn(Optional.of(brand));

        ConsumptionTypesTable consumptionTable = mock(ConsumptionTypesTable.class);
        when(consumptionTable.findById(4)).thenReturn(Optional.of(consumption));

        AlcoholVolumeTable volumeTable = mock(AlcoholVolumeTable.class);
        when(volumeTable.findById(2)).thenReturn(Optional.of(volume));

        BeerNameCollector collector = new BeerNameCollector(
                volumeTable,
                consumptionTable,
                brandsTable,
                mock(BeerFlavoursTable.class)
        );

        DrinkKey key = new DrinkKey(4, null, 2, 1, null, 4, Optional.empty());
        DrinkKey result = collector.collectBeerName(key);

        assertThat(result.name()).isPresent();
        assertThat(result.name().get()).contains("Draught").contains("0.57l");
    }

    @Test
    void usesUnknownBeerWhenBrandIdIsNull() {
        AlcoholVolume volume = new AlcoholVolume(1, "Pint", 0.568f);

        AlcoholVolumeTable volumeTable = mock(AlcoholVolumeTable.class);
        when(volumeTable.findById(2)).thenReturn(Optional.of(volume));

        BeerNameCollector collector = new BeerNameCollector(
                volumeTable,
                mock(ConsumptionTypesTable.class),
                mock(BrandsTable.class),
                mock(BeerFlavoursTable.class)
        );

        DrinkKey key = new DrinkKey(4, null, 2, null, null, null, Optional.empty());
        DrinkKey result = collector.collectBeerName(key);

        assertThat(result.name()).isPresent();
        assertThat(result.name().get()).contains("Unknown beer");
    }

    @Test
    void usesUnknownBeerWhenBrandNotFound() {
        AlcoholVolume volume = new AlcoholVolume(1, "Pint", 0.568f);

        BrandsTable brandsTable = mock(BrandsTable.class);
        when(brandsTable.findById(1)).thenReturn(Optional.empty());

        AlcoholVolumeTable volumeTable = mock(AlcoholVolumeTable.class);
        when(volumeTable.findById(2)).thenReturn(Optional.of(volume));

        BeerNameCollector collector = new BeerNameCollector(
                volumeTable,
                mock(ConsumptionTypesTable.class),
                brandsTable,
                mock(BeerFlavoursTable.class)
        );

        DrinkKey key = new DrinkKey(4, null, 2, 1, null, null, Optional.empty());
        DrinkKey result = collector.collectBeerName(key);

        assertThat(result.name()).isPresent();
        assertThat(result.name().get()).contains("Unknown beer");
    }

    @Test
    void fallsBackToBrandWhenFlavourNotFound() {
        Brand brand = new Brand(USER, "Heineken");
        AlcoholVolume volume = new AlcoholVolume(1, "Pint", 0.568f);

        BrandsTable brandsTable = mock(BrandsTable.class);
        when(brandsTable.findById(1)).thenReturn(Optional.of(brand));

        BeerFlavoursTable flavoursTable = mock(BeerFlavoursTable.class);
        when(flavoursTable.findById(3)).thenReturn(Optional.empty());

        AlcoholVolumeTable volumeTable = mock(AlcoholVolumeTable.class);
        when(volumeTable.findById(2)).thenReturn(Optional.of(volume));

        BeerNameCollector collector = new BeerNameCollector(
                volumeTable,
                mock(ConsumptionTypesTable.class),
                brandsTable,
                flavoursTable
        );

        DrinkKey key = new DrinkKey(4, null, 2, 1, 3, null, Optional.empty());
        DrinkKey result = collector.collectBeerName(key);

        assertThat(result.name()).isPresent();
        assertThat(result.name().get()).contains("Heineken").doesNotContain("Premium");
    }

    @Test
    void skipsConsumptionTypeWhenNotFound() {
        Brand brand = new Brand(USER, "Heineken");
        AlcoholVolume volume = new AlcoholVolume(1, "Pint", 0.568f);

        BrandsTable brandsTable = mock(BrandsTable.class);
        when(brandsTable.findById(1)).thenReturn(Optional.of(brand));

        ConsumptionTypesTable consumptionTable = mock(ConsumptionTypesTable.class);
        when(consumptionTable.findById(4)).thenReturn(Optional.empty());

        AlcoholVolumeTable volumeTable = mock(AlcoholVolumeTable.class);
        when(volumeTable.findById(2)).thenReturn(Optional.of(volume));

        BeerNameCollector collector = new BeerNameCollector(
                volumeTable,
                consumptionTable,
                brandsTable,
                mock(BeerFlavoursTable.class)
        );

        DrinkKey key = new DrinkKey(4, null, 2, 1, null, 4, Optional.empty());
        DrinkKey result = collector.collectBeerName(key);

        assertThat(result.name()).isPresent();
        assertThat(result.name().get()).contains("Heineken").contains("0.57l");
    }
}

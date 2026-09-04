package com.drinksaver.service.namecollector;

import com.drinksaver.repository.postgres.schema.AlcoholVolumeTable;
import com.drinksaver.repository.postgres.schema.BeerFlavoursTable;
import com.drinksaver.repository.postgres.schema.BrandsTable;
import com.drinksaver.repository.postgres.schema.ConsumptionTypesTable;
import com.drinksaver.service.model.DrinkKey;
import org.springframework.stereotype.Service;

@Service
public class BeerNameCollector {
    private final AlcoholVolumeTable alcoholVolumeTable;
    private final ConsumptionTypesTable consumptionTypesTable;
    private final BrandsTable brandsTable;
    private final BeerFlavoursTable beerFlavoursTable;

    public BeerNameCollector(
        AlcoholVolumeTable alcoholVolumeTable,
        ConsumptionTypesTable consumptionTypesTable,
        BrandsTable brandsTable,
        BeerFlavoursTable beerFlavoursTable
    ) {
        this.alcoholVolumeTable = alcoholVolumeTable;
        this.consumptionTypesTable = consumptionTypesTable;
        this.brandsTable = brandsTable;
        this.beerFlavoursTable = beerFlavoursTable;
    }

    public DrinkKey collectBeerName(DrinkKey key) {
        return key.withName(String.format(
            "%s %s",
            getBeerName(key.brandId(), key.beerFlavourId()),
            getAlcoholVolumeName(key.alcoholVolumeId(), key.consumptionTypeId())
        ));
    }

    private String getBeerName(Integer brandId, Integer beerFlavourId) {
        return brandId == null
            ? "Unknown beer"
            : brandsTable
                .findById(brandId)
                .map(brandName -> {
                    if (beerFlavourId == null) {
                        return brandName.getName();
                    } else {
                        return beerFlavoursTable
                            .findById(beerFlavourId)
                            .map(flavour -> String.format("%s %s", brandName.getName(), flavour.getName()))
                            .orElse(brandName.getName());
                    }
                })
                .orElse("Unknown beer");
    }

    private String getAlcoholVolumeName(Integer alcoholVolumeId, Integer consumptionTypeId) {
        return consumptionTypesTable
            .findById(consumptionTypeId)
            .map(consumptionType -> String.format("(%s%s)", consumptionType.getName(), getVolumeName(alcoholVolumeId)))
            .orElse(getVolumeName(alcoholVolumeId));
    }

    private String getVolumeName(Integer alcoholVolumeId) {
        return alcoholVolumeTable
            .findById(alcoholVolumeId)
            .map(volume -> String.format(" - %.2fl", volume.getVolume()))
            .orElse("");
    }
}

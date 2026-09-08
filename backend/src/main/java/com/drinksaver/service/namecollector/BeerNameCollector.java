package com.drinksaver.service.namecollector;

import com.drinksaver.repository.postgres.schema.AlcoholVolumeTable;
import com.drinksaver.repository.postgres.schema.BeerFlavoursTable;
import com.drinksaver.repository.postgres.schema.BrandsTable;
import com.drinksaver.repository.postgres.schema.ConsumptionTypesTable;
import com.drinksaver.service.model.DrinkKey;
import org.springframework.stereotype.Service;

import java.util.Locale;

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

    /**
     * consumption_type_id and alcohol_volume_id are both nullable, and Spring Data's
     * findById rejects a null id with IllegalArgumentException, so each id is checked
     * before its lookup rather than letting one incomplete drink fail the whole
     * history request.
     */
    private String getAlcoholVolumeName(Integer alcoholVolumeId, Integer consumptionTypeId) {
        if (consumptionTypeId == null) {
            return getVolumeName(alcoholVolumeId);
        }
        return consumptionTypesTable
            .findById(consumptionTypeId)
            .map(consumptionType -> String.format("(%s%s)", consumptionType.getName(), getVolumeName(alcoholVolumeId)))
            .orElse(getVolumeName(alcoholVolumeId));
    }

    /**
     * Locale.ROOT pins the decimal separator: a bare %.2f follows the default locale
     * and would render "0,50l" wherever that is comma-decimal.
     */
    private String getVolumeName(Integer alcoholVolumeId) {
        if (alcoholVolumeId == null) {
            return "";
        }
        return alcoholVolumeTable
            .findById(alcoholVolumeId)
            .map(volume -> String.format(Locale.ROOT, " - %.2fl", volume.getVolume()))
            .orElse("");
    }
}

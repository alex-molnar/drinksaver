package com.drinksaver.service.namecollector;

import com.drinksaver.model.db.AlcoholSubtype;
import com.drinksaver.model.db.AlcoholType;
import com.drinksaver.repository.postgres.schema.AlcoholSubtypesTable;
import com.drinksaver.repository.postgres.schema.AlcoholTypesTable;
import com.drinksaver.repository.postgres.schema.AlcoholVolumeTable;
import com.drinksaver.service.model.DrinkKey;
import org.springframework.stereotype.Service;

@Service
public class AlcoholNameCollector {
    private final AlcoholVolumeTable alcoholVolumeTable;
    private final AlcoholTypesTable alcoholTypesTable;
    private final AlcoholSubtypesTable alcoholSubtypesTable;

    public AlcoholNameCollector(AlcoholVolumeTable alcoholVolumeTable, AlcoholTypesTable alcoholTypesTable, AlcoholSubtypesTable alcoholSubtypesTable) {
        this.alcoholVolumeTable = alcoholVolumeTable;
        this.alcoholTypesTable = alcoholTypesTable;
        this.alcoholSubtypesTable = alcoholSubtypesTable;
    }

    public DrinkKey collectAlcoholName(DrinkKey key) {
        return key.withName(String.format(
            "%s %s",
            getAlcoholName(key.alcoholTypeId(), key.alcoholSubtypeId()),
            getAlcoholVolumeName(key.alcoholVolumeId())
        ));
    }

    private String getAlcoholName(Integer alcoholTypeId, Integer alcoholSubtypeId) {
        return alcoholSubtypeId != null
                ? alcoholSubtypesTable
                    .findById(alcoholSubtypeId)
                    .map(AlcoholSubtype::getName)
                    .orElse(getAlcoholTypeName(alcoholTypeId))
                : getAlcoholTypeName(alcoholTypeId);
    }

    private String getAlcoholTypeName(Integer alcoholTypeId) {
        if (alcoholTypeId != null) {
            return alcoholTypesTable.findById(alcoholTypeId)
                    .map(AlcoholType::getName)
                    .orElse("Unknown alcohol");
        } else {
            return "Unknown alcohol";
        }
    }

    private String getAlcoholVolumeName(Integer alcoholVolumeId) {
        return alcoholVolumeTable
            .findById(alcoholVolumeId)
            .map(volume -> String.format("(%s - %.2fl)", volume.getName(), volume.getVolume()))
            .orElse("Unknown volume");
    }
}

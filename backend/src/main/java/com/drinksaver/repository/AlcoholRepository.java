package com.drinksaver.repository;

import com.drinksaver.model.db.AlcoholSubtype;
import com.drinksaver.model.db.AlcoholType;
import com.drinksaver.model.db.AlcoholVolume;
import com.drinksaver.model.dto.NewAlcoholEntry;
import com.drinksaver.model.dto.NewAlcoholSubtype;
import com.drinksaver.model.dto.NewVolumeEntry;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AlcoholRepository {
    boolean is(String repositoryType);
    List<AlcoholType> getAlcoholTypes(UUID userId);
    List<AlcoholSubtype> getSubtypesByAlcoholType(Integer alcoholTypeId, UUID userId);
    AlcoholSubtype saveSubtypeForAlcoholType(Integer alcoholTypeId, NewAlcoholSubtype newAlcoholSubtype);
    List<AlcoholVolume> getVolumesByAlcoholType(Integer alcoholTypeId);
    /**
     * Empty when the alcohol type does not exist, so the caller can answer 404 rather
     * than a 200 carrying an all-null volume.
     */
    Optional<AlcoholVolume> saveVolumeForAlcoholType(Integer alcoholTypeId, NewVolumeEntry volumeDescription);
    AlcoholType createAlcoholType(NewAlcoholEntry newAlcoholEntry);
}

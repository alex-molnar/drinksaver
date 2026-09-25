package com.drinksaver.repository;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.AlcoholSubtype;
import com.drinksaver.model.db.AlcoholType;
import com.drinksaver.model.db.AlcoholVolume;
import com.drinksaver.model.dto.NewAlcoholEntry;
import com.drinksaver.model.dto.NewAlcoholSubtype;
import com.drinksaver.model.dto.NewVolumeEntry;
import com.drinksaver.repository.schema.AlcoholSubtypesTable;
import com.drinksaver.repository.schema.AlcoholTypesTable;
import com.drinksaver.repository.schema.AlcoholVolumeTable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

@Repository
public class AlcoholRepository {
    private final AlcoholTypesTable alcoholTypesTable;
    private final AlcoholSubtypesTable alcoholSubtypesTable;
    private final AlcoholVolumeTable alcoholVolumeTable;
    private final RepositoryConfiguration repositoryConfiguration;

    public AlcoholRepository(AlcoholTypesTable alcoholTypesTable, AlcoholSubtypesTable alcoholSubtypesTable, AlcoholVolumeTable alcoholVolumeTable, RepositoryConfiguration repositoryConfiguration) {
        this.alcoholTypesTable = alcoholTypesTable;
        this.alcoholSubtypesTable = alcoholSubtypesTable;
        this.alcoholVolumeTable = alcoholVolumeTable;
        this.repositoryConfiguration = repositoryConfiguration;
    }

    public List<AlcoholType> getAlcoholTypes(UUID userId) {
        return alcoholTypesTable.findAllByUserIdInOrderByNameAsc(List.of(userId, repositoryConfiguration.adminUserUUID()));
    }

    public List<AlcoholSubtype> getSubtypesByAlcoholType(Integer alcoholTypeId, UUID userId) {
        return alcoholSubtypesTable.findAllByAlcoholTypeIdAndUserIdInOrderByNameAsc(alcoholTypeId, List.of(userId, repositoryConfiguration.adminUserUUID()));
    }

    public AlcoholSubtype saveSubtypeForAlcoholType(Integer alcoholTypeId, NewAlcoholSubtype newAlcoholSubtype) {
        return alcoholSubtypesTable.save(new AlcoholSubtype(alcoholTypeId, newAlcoholSubtype.userId(), newAlcoholSubtype.name(), newAlcoholSubtype.colorPaletteId(), newAlcoholSubtype.glasswareId()));
    }

    public List<AlcoholVolume> getVolumesByAlcoholType(Integer alcoholTypeId) {
        return alcoholTypesTable
                .findById(alcoholTypeId)
                .map(alcoholType -> alcoholVolumeTable.findAllById(alcoholType.getVolumeIds()))
                .orElse(List.of());
    }

    /**
     * Two writes, the volume and the type it is attached to, so they commit together.
     * Without a transaction a failure on the second left an orphaned volume row that
     * nothing referenced.
     *
     * This closes the failure case only, and the original comment here overclaimed by
     * not saying so. AlcoholType has no @Version and the transaction runs at READ
     * COMMITTED, so two concurrent calls for the same type both read volumeIds, both
     * append, and the second write wins: the first volume is orphaned exactly as
     * before. Fixing that needs optimistic locking, which is a schema change; see
     * docs/remaining-work.md.
     */
    @Transactional
    public Optional<AlcoholVolume> saveVolumeForAlcoholType(Integer alcoholTypeId, NewVolumeEntry volumeDescription) {
        return alcoholTypesTable.findById(alcoholTypeId)
                .map(alcoholType -> {
                    AlcoholVolume savedVolume = alcoholVolumeTable.save(AlcoholVolume.of(volumeDescription));
                    alcoholType.getVolumeIds().add(savedVolume.getId());
                    alcoholTypesTable.save(alcoholType);
                    return savedVolume;
                });
    }

    /**
     * Volumes, then the type, then the subtypes: three separate writes that only make
     * sense as one. A failure part way used to leave orphaned volume rows and a type
     * with no subtypes, with nothing to say the request had half succeeded.
     */
    @Transactional
    public AlcoholType createAlcoholType(NewAlcoholEntry newAlcoholEntry) {
        List<Integer> volumeIds = newAlcoholEntry.volumes() != null
            ? newAlcoholEntry.volumes()
                .stream()
                .map(newEntry -> alcoholVolumeTable.save(AlcoholVolume.of(newEntry)).getId())
                .toList()
            : Collections.emptyList();
        AlcoholType result = alcoholTypesTable.save(new AlcoholType(newAlcoholEntry.userId(), newAlcoholEntry.name(), volumeIds, newAlcoholEntry.colorPaletteId(), newAlcoholEntry.glasswareId()));
        if (newAlcoholEntry.alcoholSubtypes() != null && !newAlcoholEntry.alcoholSubtypes().isEmpty()) {
            alcoholSubtypesTable.saveAll(
                    newAlcoholEntry.alcoholSubtypes()
                            .stream()
                            .map(subtype -> new AlcoholSubtype(result.getId(), newAlcoholEntry.userId(), subtype))
                            .toList()
            );
        }
        return result;
    }
}

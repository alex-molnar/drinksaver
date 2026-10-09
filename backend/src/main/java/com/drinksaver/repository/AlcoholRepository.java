package com.drinksaver.repository;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.AlcoholSubtype;
import com.drinksaver.model.db.AlcoholType;
import com.drinksaver.model.db.AlcoholVolume;
import com.drinksaver.model.dto.patch.UpdateAlcoholSubtype;
import com.drinksaver.model.dto.patch.UpdateAlcoholType;
import com.drinksaver.model.dto.post.NewAlcoholEntry;
import com.drinksaver.model.dto.post.NewAlcoholSubtype;
import com.drinksaver.model.dto.post.NewVolumeEntry;
import com.drinksaver.repository.schema.AlcoholSubtypesTable;
import com.drinksaver.repository.schema.AlcoholTypesTable;
import com.drinksaver.repository.schema.AlcoholVolumeTable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.xml.sax.ext.LexicalHandler;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

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

    public List<AlcoholType> getAdminAlcoholTypes() {
        return alcoholTypesTable.findAllByUserIdOrderByNameAsc(repositoryConfiguration.adminUserUUID());
    }

    public List<AlcoholType> getUserDefinedAlcoholTypes() {
        return alcoholTypesTable.findAllByUserIdNot(repositoryConfiguration.adminUserUUID());
    }

    public Optional<AlcoholType> editAlcoholType(Integer alcoholTypeId, UpdateAlcoholType updateAlcoholType) {
        return alcoholTypesTable.findById(alcoholTypeId).map(existing -> alcoholTypesTable.save(existing.withUpdates(updateAlcoholType)));
    }

    public Optional<AlcoholType> publishAlcoholType(Integer id) {
        return alcoholTypesTable.findById(id).map(existing -> alcoholTypesTable.save(existing.withUserId(repositoryConfiguration.adminUserUUID())));
    }

    public int deleteAlcoholType(Integer id) {
        if (alcoholTypesTable.existsById(id)) {
            try {
                alcoholTypesTable.deleteById(id);
                return 204;
            } catch (DataIntegrityViolationException e) {
                return 409;
            }
        } else {
            return 404;
        }
    }

    public List<AlcoholSubtype> getSubtypesByAlcoholType(Integer alcoholTypeId, UUID userId) {
        return alcoholSubtypesTable.findAllByAlcoholTypeIdAndUserIdInOrderByNameAsc(alcoholTypeId, List.of(userId, repositoryConfiguration.adminUserUUID()));
    }

    public List<AlcoholSubtype> getAdminSubtypesByAlcoholType(Integer alcoholTypeId) {
        return alcoholSubtypesTable.findAllByAlcoholTypeIdAndUserIdOrderByNameAsc(alcoholTypeId, repositoryConfiguration.adminUserUUID());
    }

    public List<AlcoholSubtype> getUserDefinedSubtypesByAlcoholType(Integer alcoholTypeId) {
        return alcoholSubtypesTable.findAllByAlcoholTypeIdAndUserIdNotOrderByNameAsc(alcoholTypeId, repositoryConfiguration.adminUserUUID());
    }

    public AlcoholSubtype saveSubtypeForAlcoholType(Integer alcoholTypeId, NewAlcoholSubtype newAlcoholSubtype) {
        return alcoholSubtypesTable.save(new AlcoholSubtype(alcoholTypeId, newAlcoholSubtype.userId(), newAlcoholSubtype.name(), newAlcoholSubtype.colorPaletteId(), newAlcoholSubtype.glasswareId()));
    }

    public AlcoholSubtype saveAdminSubtypeForAlcoholType(Integer alcoholTypeId, NewAlcoholSubtype newAlcoholSubtype) {
        return saveSubtypeForAlcoholType(alcoholTypeId, newAlcoholSubtype.withUserId(repositoryConfiguration.adminUserUUID()));
    }

    public Optional<AlcoholSubtype> editAlcoholSubtype(Long alcoholSubtypeId, UpdateAlcoholSubtype updateAlcoholSubtype) {
        return alcoholSubtypesTable.findById(alcoholSubtypeId).map(existing -> alcoholSubtypesTable.save(existing.withUpdate(updateAlcoholSubtype)));
    }

    public Optional<AlcoholSubtype> publishAlcoholSubtype(Long id) {
        return alcoholSubtypesTable.findById(id).map(existing -> alcoholSubtypesTable.save(existing.withUserId(repositoryConfiguration.adminUserUUID())));
    }

    public int deleteAlcoholSubType(Long id) {
        if (alcoholSubtypesTable.existsById(id)) {
            try {
                alcoholSubtypesTable.deleteById(id);
                return 204;
            } catch (DataIntegrityViolationException e) {
                return 409;
            }
        } else {
            return 404;
        }
    }

    public List<AlcoholVolume> getVolumesByAlcoholType(Integer alcoholTypeId) {
        return alcoholTypesTable
                .findById(alcoholTypeId)
                .map(alcoholType -> alcoholVolumeTable.findAllById(alcoholType.getVolumeIds()))
                .orElse(List.of());
    }

    /**
     * Volumes are scoped to their alcohol type. Only that type's owner may extend its
     * volume list; returning empty for a missing or foreign type lets the controller
     * answer 404 without exposing whether another user's type exists. Both writes, the
     * volume and its parent type, commit together so a failure cannot leave an
     * unreferenced volume. Concurrent appends can still lose an update because
     * AlcoholType has no @Version; see FIX-2 in docs/remaining-work.md.
     */
    @Transactional
    public Optional<AlcoholVolume> saveVolumeForAlcoholType(Integer alcoholTypeId, UUID userId, NewVolumeEntry volumeDescription) {
        return alcoholTypesTable.findById(alcoholTypeId)
                .filter(alcoholType -> userId.equals(alcoholType.getUserId()))
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

    @Transactional
    public AlcoholType createAdminAlcoholType(NewAlcoholEntry newAlcoholEntry) {
        return createAlcoholType(newAlcoholEntry.withUserId(repositoryConfiguration.adminUserUUID()));
    }
}

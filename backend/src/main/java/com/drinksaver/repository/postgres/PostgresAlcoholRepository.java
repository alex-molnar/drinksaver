package com.drinksaver.repository.postgres;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.AlcoholSubtype;
import com.drinksaver.model.db.AlcoholType;
import com.drinksaver.model.db.AlcoholVolume;
import com.drinksaver.model.dto.NewAlcoholEntry;
import com.drinksaver.model.dto.NewAlcoholSubtype;
import com.drinksaver.model.dto.NewVolumeEntry;
import com.drinksaver.repository.AlcoholRepository;
import com.drinksaver.repository.postgres.schema.AlcoholSubtypesTable;
import com.drinksaver.repository.postgres.schema.AlcoholTypesTable;
import com.drinksaver.repository.postgres.schema.AlcoholVolumeTable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

@Repository
public class PostgresAlcoholRepository implements AlcoholRepository {
    private final AlcoholTypesTable alcoholTypesTable;
    private final AlcoholSubtypesTable alcoholSubtypesTable;
    private final AlcoholVolumeTable alcoholVolumeTable;
    private final RepositoryConfiguration repositoryConfiguration;

    public PostgresAlcoholRepository(AlcoholTypesTable alcoholTypesTable, AlcoholSubtypesTable alcoholSubtypesTable, AlcoholVolumeTable alcoholVolumeTable, RepositoryConfiguration repositoryConfiguration) {
        this.alcoholTypesTable = alcoholTypesTable;
        this.alcoholSubtypesTable = alcoholSubtypesTable;
        this.alcoholVolumeTable = alcoholVolumeTable;
        this.repositoryConfiguration = repositoryConfiguration;
    }

    @Override
    public boolean is(String repositoryType) {
        return repositoryType.equalsIgnoreCase("postgres");
    }

    @Override
    public List<AlcoholType> getAlcoholTypes(UUID userId) {
        return alcoholTypesTable.findAllByUserIdInOrderByNameAsc(Stream.concat(
            repositoryConfiguration.adminUserList().stream(),
            Stream.of(userId)
        ).toList());
    }

    @Override
    public List<AlcoholSubtype> getSubtypesByAlcoholType(Integer alcoholTypeId, UUID userId) {
        return alcoholSubtypesTable.findAllByAlcoholTypeIdAndUserIdInOrderByNameAsc(alcoholTypeId, Stream.concat(
            repositoryConfiguration.adminUserList().stream(),
            Stream.of(userId)
        ).toList());
    }

    @Override
    public AlcoholSubtype saveSubtypeForAlcoholType(Integer alcoholTypeId, NewAlcoholSubtype newAlcoholSubtype) {
        return alcoholSubtypesTable.save(new AlcoholSubtype(alcoholTypeId, newAlcoholSubtype.userId(), newAlcoholSubtype.name()));
    }

    @Override
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
    @Override
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
    @Override
    @Transactional
    public AlcoholType createAlcoholType(NewAlcoholEntry newAlcoholEntry) {
        List<Integer> volumeIds = newAlcoholEntry.volumes() != null
            ? newAlcoholEntry.volumes()
                .stream()
                .map(newEntry -> alcoholVolumeTable.save(AlcoholVolume.of(newEntry)).getId())
                .toList()
            : Collections.emptyList();
        AlcoholType result = alcoholTypesTable.save(new AlcoholType(newAlcoholEntry.userId(), newAlcoholEntry.name(), volumeIds));  // TODO: this right now defaults color palettte, set this properly
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

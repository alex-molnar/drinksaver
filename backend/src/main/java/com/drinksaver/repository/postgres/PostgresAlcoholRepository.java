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
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.Collections;
import java.util.List;
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

    @Override
    public AlcoholVolume saveVolumeForAlcoholType(Integer alcoholTypeId, NewVolumeEntry volumeDescription) {
        return alcoholTypesTable.findById(alcoholTypeId)
                .map(alcoholType -> {
                    AlcoholVolume savedVolume = alcoholVolumeTable.save(AlcoholVolume.of(volumeDescription));
                    alcoholType.getVolumeIds().add(savedVolume.getId());
                    alcoholTypesTable.save(alcoholType);
                    return savedVolume;
                })
                .orElse(new AlcoholVolume()); // TODO ResponseEntity 404
    }

    @Override
    public AlcoholType createAlcoholType(NewAlcoholEntry newAlcoholEntry) {
        // TODO in transaction
        List<Integer> volumeIds = newAlcoholEntry.volumes() != null
            ? newAlcoholEntry.volumes()
                .stream()
                .map(newEntry -> alcoholVolumeTable.save(AlcoholVolume.of(newEntry)).getId())
                .toList()
            : Collections.emptyList();
        AlcoholType result = alcoholTypesTable.save(new AlcoholType(newAlcoholEntry.userId(), newAlcoholEntry.name(), volumeIds));
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

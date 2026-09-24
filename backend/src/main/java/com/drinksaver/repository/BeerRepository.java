package com.drinksaver.repository;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.BeerFlavour;
import com.drinksaver.model.db.Brand;
import com.drinksaver.model.db.ConsumptionType;
import com.drinksaver.repository.schema.BeerFlavoursTable;
import com.drinksaver.repository.schema.BrandsTable;
import com.drinksaver.repository.schema.ConsumptionTypesTable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

@Repository
public class BeerRepository {
    private final BrandsTable brandsTable;
    private final ConsumptionTypesTable consumptionTypesTable;
    private final BeerFlavoursTable beerFlavoursTable;
    private final RepositoryConfiguration repositoryConfiguration;

    @Autowired
    public BeerRepository(
            BrandsTable brandsTable,
            ConsumptionTypesTable consumptionTypesTable,
            BeerFlavoursTable beerFlavoursTable,
            RepositoryConfiguration repositoryConfiguration
    ) {
        this.brandsTable = brandsTable;
        this.consumptionTypesTable = consumptionTypesTable;
        this.beerFlavoursTable = beerFlavoursTable;
        this.repositoryConfiguration = repositoryConfiguration;
    }

    public List<Brand> getBrands(UUID userId) {
        return brandsTable.findAllByUserIdInOrderByName(Stream.concat(
            repositoryConfiguration.adminUserList().stream(),
            Stream.of(userId)
        ).toList());
    }

    public List<ConsumptionType> getConsumptionTypes(Integer maxAmount) {
        return consumptionTypesTable.findAll(Pageable.ofSize(maxAmount)).toList();
    }

    public Brand saveBrand(UUID userId, String name, List<String> flavours, Integer colorPaletteId) {
        Brand result = brandsTable.save(new Brand(userId, name, colorPaletteId));
        if(flavours != null && !flavours.isEmpty()) {
            beerFlavoursTable.saveAll(
                    flavours
                            .stream()
                            .map(flavour -> new BeerFlavour(result.getId(), userId, flavour))
                            .toList()
            );
        }
        return result;
    }

    public List<BeerFlavour> getBeerFlavours(Integer brandId, UUID userId) {
        return beerFlavoursTable.findAllByBrandIdAndUserIdIn(brandId, Stream.concat(
            repositoryConfiguration.adminUserList().stream(),
            Stream.of(userId)
        ).toList());
    }

    public BeerFlavour saveBeerFlavour(Integer brandId, UUID userId, String name, Integer colorPaletteId) {
        return beerFlavoursTable.save(new BeerFlavour(brandId, userId, name, colorPaletteId));
    }
}

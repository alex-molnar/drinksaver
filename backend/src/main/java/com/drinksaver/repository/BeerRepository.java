package com.drinksaver.repository;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.BeerFlavour;
import com.drinksaver.model.db.Brand;
import com.drinksaver.model.db.ConsumptionType;
import com.drinksaver.model.dto.patch.UpdateBeerBrand;
import com.drinksaver.model.dto.patch.UpdateBeerFlavour;
import com.drinksaver.model.dto.patch.UpdateConsumptionType;
import com.drinksaver.model.dto.post.NewConsumptionType;
import com.drinksaver.repository.schema.BeerFlavoursTable;
import com.drinksaver.repository.schema.BrandsTable;
import com.drinksaver.repository.schema.ConsumptionTypesTable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

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
        return brandsTable.findAllByUserIdInOrderByName(List.of(userId, repositoryConfiguration.adminUserUUID()));
    }

    public List<Brand> getAdminBrands() {
        return brandsTable.findAllByUserIdOrderByNameAsc(repositoryConfiguration.adminUserUUID());
    }

    public List<Brand> getUserDefinedBrands() {
        return brandsTable.findAllByUserIdNotOrderByNameAsc(repositoryConfiguration.adminUserUUID());
    }

    public Optional<Brand> editBrand(Integer id, UpdateBeerBrand updateBeerBrand) {
        return brandsTable.findById(id).map(existing -> brandsTable.save(existing.withUpdate(updateBeerBrand)));
    }

    public int deleteBrandById(Integer id) {
        if (brandsTable.existsById(id)) {
            try {
                brandsTable.deleteById(id);
                return 204;
            } catch (DataIntegrityViolationException e) {
                return 409;
            }
        } else {
            return 404;
        }
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

    public Brand saveAdminBrand(String name, List<String> flavours, Integer colorPaletteId) {
        return saveBrand(repositoryConfiguration.adminUserUUID(), name, flavours, colorPaletteId);
    }

    public Optional<Brand> publishBrand(Integer id) {
        return brandsTable.findById(id).map(existing -> brandsTable.save(existing.withUserId(repositoryConfiguration.adminUserUUID())));
    }

    public List<BeerFlavour> getBeerFlavours(Integer brandId, UUID userId) {
        return beerFlavoursTable.findAllByBrandIdAndUserIdIn(brandId, List.of(userId, repositoryConfiguration.adminUserUUID()));
    }

    public List<BeerFlavour> getAdminBeerFlavoursByBrandId(Integer brandId) {
        return beerFlavoursTable.findAllByBrandIdAndUserId(brandId, repositoryConfiguration.adminUserUUID());
    }

    public List<BeerFlavour> getUserDefinedBeerFlavoursByBrandId(Integer brandId) {
        return beerFlavoursTable.findAllByBrandIdAndUserIdNot(brandId, repositoryConfiguration.adminUserUUID());
    }

    public Optional<BeerFlavour> editBeerFlavour(Integer id, UpdateBeerFlavour updateBeerFlavour) {
        return beerFlavoursTable.findById(id).map(existing -> beerFlavoursTable.save(existing.withUpdate(updateBeerFlavour)));
    }

    public BeerFlavour saveBeerFlavour(Integer brandId, UUID userId, String name, Integer colorPaletteId) {
        return beerFlavoursTable.save(new BeerFlavour(brandId, userId, name, colorPaletteId));
    }

    public BeerFlavour saveAdminBeerFlavour(Integer brandId, String name, Integer colorPaletteId) {
        return saveBeerFlavour(brandId, repositoryConfiguration.adminUserUUID(), name, colorPaletteId);
    }

    public Optional<BeerFlavour> publishBeerFlavour(Integer id) {
        return beerFlavoursTable.findById(id).map(existing -> beerFlavoursTable.save(existing.withUserId(repositoryConfiguration.adminUserUUID())));
    }

    public int deleteBeerFlavourById(Integer id) {
        if (beerFlavoursTable.existsById(id)) {
            try {
                beerFlavoursTable.deleteById(id);
                return 204;
            } catch (DataIntegrityViolationException e) {
                return 409;
            }
        } else {
            return 404;
        }
    }

    public List<ConsumptionType> getConsumptionTypes(Integer maxAmount) {
        return consumptionTypesTable.findAll(Pageable.ofSize(maxAmount)).toList();
    }

    public Optional<ConsumptionType> editConsumptionType(Integer id, UpdateConsumptionType updateConsumptionType) {
        return consumptionTypesTable.findById(id).map(existing -> consumptionTypesTable.save(existing.withUpdate(updateConsumptionType)));
    }

    public ConsumptionType saveAdminConsumptionType(NewConsumptionType newConsumptionType) {
        return consumptionTypesTable.save(new ConsumptionType(newConsumptionType.name(), newConsumptionType.glasswareId()));
    }

    public int deleteConsumptionTypeById(Integer id) {
        if (consumptionTypesTable.existsById(id)) {
            try {
                consumptionTypesTable.deleteById(id);
                return 204;
            } catch (DataIntegrityViolationException e) {
                return 409;
            }
        } else {
            return 404;
        }
    }
}

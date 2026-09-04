package com.drinksaver.repository;

import com.drinksaver.model.db.BeerFlavour;
import com.drinksaver.model.db.Brand;
import com.drinksaver.model.db.ConsumptionType;

import java.util.List;
import java.util.UUID;

public interface BeerRepository {
    boolean is(String repositoryType);
    List<Brand> getBrands(UUID userId);
    List<ConsumptionType> getConsumptionTypes(Integer maxAmount);
    Brand saveBrand(UUID userId, String name, List<String> flavours);
    List<BeerFlavour> getBeerFlavours(Integer brandId, UUID userId);
    BeerFlavour saveBeerFlavour(Integer brandId, UUID userId, String name);
}


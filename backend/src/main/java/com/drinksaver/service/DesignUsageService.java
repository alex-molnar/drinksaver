package com.drinksaver.service;

import com.drinksaver.repository.schema.*;
import org.springframework.stereotype.Service;

@Service
public class DesignUsageService {
    private final AlcoholTypesTable alcoholTypesTable;
    private final AlcoholSubtypesTable alcoholSubtypesTable;
    private final BrandsTable brandsTable;
    private final BeerFlavoursTable beerFlavoursTable;
    private final ConsumptionTypesTable consumptionTypesTable;
    private final RecommendationsTable recommendationsTable;
    private final SavedDrinksTable savedDrinksTable;

    public DesignUsageService(
            AlcoholTypesTable alcoholTypesTable,
            AlcoholSubtypesTable alcoholSubtypesTable,
            BrandsTable brandsTable,
            BeerFlavoursTable beerFlavoursTable,
            ConsumptionTypesTable consumptionTypesTable,
            RecommendationsTable recommendationsTable,
            SavedDrinksTable savedDrinksTable) {
        this.alcoholTypesTable = alcoholTypesTable;
        this.alcoholSubtypesTable = alcoholSubtypesTable;
        this.brandsTable = brandsTable;
        this.beerFlavoursTable = beerFlavoursTable;
        this.consumptionTypesTable = consumptionTypesTable;
        this.recommendationsTable = recommendationsTable;
        this.savedDrinksTable = savedDrinksTable;
    }

    public long countColorPaletteIdUsage(Integer colorPaletteId) {
        return
            alcoholTypesTable.countByColorPaletteId(colorPaletteId) +
            alcoholSubtypesTable.countByColorPaletteId(colorPaletteId) +
            brandsTable.countByColorPaletteId(colorPaletteId) +
            beerFlavoursTable.countByColorPaletteId(colorPaletteId) +
            recommendationsTable.countByColorPaletteId(colorPaletteId) +
            savedDrinksTable.countByColorPaletteId(colorPaletteId);
    }

    public long countGlasswareIdUsage(Integer glasswareId) {
        return
            alcoholTypesTable.countByGlasswareId(glasswareId) +
            alcoholSubtypesTable.countByGlasswareId(glasswareId) +
            consumptionTypesTable.countByGlasswareId(glasswareId) +
            recommendationsTable.countByGlasswareId(glasswareId) +
            savedDrinksTable.countByGlasswareId(glasswareId);
    }
}

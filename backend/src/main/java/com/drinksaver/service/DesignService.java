package com.drinksaver.service;

import com.drinksaver.model.db.ColorPalette;
import com.drinksaver.model.db.Glassware;
import com.drinksaver.model.dto.NewColorPalette;
import com.drinksaver.model.dto.NewGlassware;
import com.drinksaver.model.dto.UpdateColorPalette;
import com.drinksaver.model.dto.UpdateGlassware;
import com.drinksaver.repository.schema.*;
import com.drinksaver.repository.schema.admin.DefaultRecommendationsTable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public class DesignService {
    private final ColorPalettesTable colorPalettesTable;
    private final GlasswareTable glasswareTable;

    private final AlcoholTypesTable alcoholTypesTable;
    private final AlcoholSubtypesTable alcoholSubtypesTable;
    private final BrandsTable brandsTable;
    private final BeerFlavoursTable beerFlavoursTable;
    private final ConsumptionTypesTable consumptionTypesTable;
    private final RecommendationsTable recommendationsTable;
    private final DefaultRecommendationsTable defaultRecommendationsTable;
    private final SavedDrinksTable savedDrinksTable;

    @Autowired
    public DesignService(
            ColorPalettesTable colorPalettesTable,
            GlasswareTable glasswareTable,
            AlcoholTypesTable alcoholTypesTable,
            AlcoholSubtypesTable alcoholSubtypesTable,
            BrandsTable brandsTable,
            BeerFlavoursTable beerFlavoursTable,
            ConsumptionTypesTable consumptionTypesTable,
            RecommendationsTable recommendationsTable,
            DefaultRecommendationsTable defaultRecommendationsTable,
            SavedDrinksTable savedDrinksTable) {
        this.colorPalettesTable = colorPalettesTable;
        this.glasswareTable = glasswareTable;
        this.alcoholTypesTable = alcoholTypesTable;
        this.alcoholSubtypesTable = alcoholSubtypesTable;
        this.brandsTable = brandsTable;
        this.beerFlavoursTable = beerFlavoursTable;
        this.consumptionTypesTable = consumptionTypesTable;
        this.recommendationsTable = recommendationsTable;
        this.defaultRecommendationsTable = defaultRecommendationsTable;
        this.savedDrinksTable = savedDrinksTable;
    }

    public List<ColorPalette> getAvailableColorPalettes() {
        return colorPalettesTable.findAll();
    }

    public ColorPalette saveColorPalette(NewColorPalette newColorPalette) {
        ColorPalette colorPalette = new ColorPalette(
            newColorPalette.name(),
            newColorPalette.field(),
            newColorPalette.inkLight(),
            newColorPalette.inkDark()
        );

        return colorPalettesTable.save(colorPalette);
    }

    public Optional<ColorPalette> updateColorPalette(Integer colorPaletteId, UpdateColorPalette updateColorPalette) {
        Optional<ColorPalette> existingColorPaletteOption = colorPalettesTable.findById(colorPaletteId);

        return existingColorPaletteOption
            .map(existingColorPalette -> colorPalettesTable.save(existingColorPalette.withOptionalUpdate(updateColorPalette)));
    }

    @Transactional
    public int deleteColorPalette(Integer colorPaletteId) {
        boolean doesColorPaletteExist = colorPalettesTable.existsById(colorPaletteId);
        if (doesColorPaletteExist && countColorPaletteIdUsage(colorPaletteId) == 0) {
            colorPalettesTable.deleteById(colorPaletteId);
            return 204;
        } else if(doesColorPaletteExist) {
            return 409;
        } else {
            return 404;
        }
    }

    public List<Glassware> getAvailableGlasswareIcons() {
        return glasswareTable.findAll();
    }

    public Glassware saveGlassware(NewGlassware newGlassware) {
        Glassware glassware = new Glassware(
            newGlassware.name(),
            newGlassware.g(),
            newGlassware.l(),
            newGlassware.f()
        );

        return glasswareTable.save(glassware);
    }

    public Optional<Glassware> updateGlassware(Integer glasswareId, UpdateGlassware updateGlassware) {
        Optional<Glassware> existingGlasswareOption = glasswareTable.findById(glasswareId);

        return existingGlasswareOption
            .map(existingGlassware -> glasswareTable.save(existingGlassware.withOptionalUpdate(updateGlassware)));
    }

    @Transactional
    public int deleteGlassware(Integer glasswareId) {
        boolean doesGlasswareExist = glasswareTable.existsById(glasswareId);
        if (doesGlasswareExist && countGlasswareIdUsage(glasswareId) == 0) {
            glasswareTable.deleteById(glasswareId);
            return 204;
        } else if(doesGlasswareExist) {
            return 409;
        } else {
            return 404;
        }
    }

    private long countColorPaletteIdUsage(Integer colorPaletteId) {
        return
            alcoholTypesTable.countByColorPaletteId(colorPaletteId) +
                alcoholSubtypesTable.countByColorPaletteId(colorPaletteId) +
                brandsTable.countByColorPaletteId(colorPaletteId) +
                beerFlavoursTable.countByColorPaletteId(colorPaletteId) +
                recommendationsTable.countByColorPaletteId(colorPaletteId) +
                defaultRecommendationsTable.countByColorPaletteId(colorPaletteId) +
                savedDrinksTable.countByColorPaletteId(colorPaletteId);
    }

    private long countGlasswareIdUsage(Integer glasswareId) {
        return
            alcoholTypesTable.countByGlasswareId(glasswareId) +
                alcoholSubtypesTable.countByGlasswareId(glasswareId) +
                consumptionTypesTable.countByGlasswareId(glasswareId) +
                recommendationsTable.countByGlasswareId(glasswareId) +
                defaultRecommendationsTable.countByGlasswareId(glasswareId) +
                savedDrinksTable.countByGlasswareId(glasswareId);
    }
}

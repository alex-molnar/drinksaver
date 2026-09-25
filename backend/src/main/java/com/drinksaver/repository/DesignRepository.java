package com.drinksaver.repository;

import com.drinksaver.model.db.ColorPalette;
import com.drinksaver.model.db.Glassware;
import com.drinksaver.model.dto.NewColorPalette;
import com.drinksaver.model.dto.NewGlassware;
import com.drinksaver.model.dto.UpdateColorPalette;
import com.drinksaver.model.dto.UpdateGlassware;
import com.drinksaver.repository.schema.ColorPalettesTable;
import com.drinksaver.repository.schema.GlasswareTable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class DesignRepository {
    private final ColorPalettesTable colorPalettesTable;
    private final GlasswareTable glasswareTable;

    @Autowired
    public DesignRepository(ColorPalettesTable colorPalettesTable, GlasswareTable glasswareTable) {
        this.colorPalettesTable = colorPalettesTable;
        this.glasswareTable = glasswareTable;
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
            .map(existingColorPalette -> existingColorPalette.withOptionalUpdate(updateColorPalette));
    }

    public boolean deleteColorPalette(Integer colorPaletteId) {
        if (colorPalettesTable.existsById(colorPaletteId)) {
            colorPalettesTable.deleteById(colorPaletteId);
            return true;
        }
        return false;
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
            .map(existingGlassware -> existingGlassware.withOptionalUpdate(updateGlassware));
    }

    public  boolean deleteGlassware(Integer glasswareId) {
        if (glasswareTable.existsById(glasswareId)) {
            glasswareTable.deleteById(glasswareId);
            return true;
        }
        return false;
    }
}

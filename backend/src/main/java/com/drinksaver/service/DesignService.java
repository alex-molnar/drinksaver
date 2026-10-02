package com.drinksaver.service;

import com.drinksaver.model.db.ColorPalette;
import com.drinksaver.model.db.Glassware;
import com.drinksaver.model.dto.NewColorPalette;
import com.drinksaver.model.dto.NewGlassware;
import com.drinksaver.model.dto.UpdateColorPalette;
import com.drinksaver.model.dto.UpdateGlassware;
import com.drinksaver.repository.schema.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class DesignService {
    private final ColorPalettesTable colorPalettesTable;
    private final GlasswareTable glasswareTable;

    @Autowired
    public DesignService(ColorPalettesTable colorPalettesTable, GlasswareTable glasswareTable) {
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
            .map(existingColorPalette -> colorPalettesTable.save(existingColorPalette.withOptionalUpdate(updateColorPalette)));
    }

    public int deleteColorPalette(Integer colorPaletteId) {
        if (colorPalettesTable.existsById(colorPaletteId)) {
            try {
                // Repository transaction commits before this call returns, so FK errors reach this catch.
                colorPalettesTable.deleteById(colorPaletteId);
                return 204;
            } catch (DataIntegrityViolationException e) {
                return 409;
            }
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

    public int deleteGlassware(Integer glasswareId) {
        if (glasswareTable.existsById(glasswareId)) {
            try {
                glasswareTable.deleteById(glasswareId);
                return 204;
            } catch (DataIntegrityViolationException e) {
                return 409;
            }
        } else {
            return 404;
        }
    }
}

package com.drinksaver.repository;

import com.drinksaver.model.db.ColorPalette;
import com.drinksaver.model.db.Glassware;
import com.drinksaver.repository.schema.ColorPalettesTable;
import com.drinksaver.repository.schema.GlasswareTable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;

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

    public List<Glassware> getAvailableGlasswareIcons() {
        return glasswareTable.findAll();
    }
}

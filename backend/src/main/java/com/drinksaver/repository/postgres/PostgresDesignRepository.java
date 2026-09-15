package com.drinksaver.repository.postgres;

import com.drinksaver.model.db.ColorPalette;
import com.drinksaver.model.db.Glassware;
import com.drinksaver.repository.DesignRepository;
import com.drinksaver.repository.postgres.schema.ColorPalettesTable;
import com.drinksaver.repository.postgres.schema.GlasswareTable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class PostgresDesignRepository implements DesignRepository {
    private final ColorPalettesTable colorPalettesTable;
    private final GlasswareTable glasswareTable;

    @Autowired
    public PostgresDesignRepository(ColorPalettesTable colorPalettesTable, GlasswareTable glasswareTable) {
        this.colorPalettesTable = colorPalettesTable;
        this.glasswareTable = glasswareTable;
    }

    @Override
    public boolean is(String repositoryType) {
        return repositoryType.equalsIgnoreCase("postgres");
    }

    @Override
    public List<ColorPalette> getAvailableColorPalettes() {
        return colorPalettesTable.findAll();
    }

    @Override
    public List<Glassware> getAvailableGlasswareIcons() {
        return glasswareTable.findAll();
    }
}

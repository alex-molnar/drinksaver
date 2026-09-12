package com.drinksaver.repository;

import com.drinksaver.model.db.ColorPalette;
import com.drinksaver.model.db.Glassware;

import java.util.List;

public interface DesignRepository {
    boolean is(String repositoryType);
    List<ColorPalette> getAvailableColorPalettes();
    List<Glassware> getAvailableGlasswareIcons();
}

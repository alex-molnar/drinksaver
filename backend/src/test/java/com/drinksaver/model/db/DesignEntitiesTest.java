package com.drinksaver.model.db;

import com.drinksaver.model.dto.UpdateColorPalette;
import com.drinksaver.model.dto.UpdateGlassware;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DesignEntitiesTest {

    @Test
    void colorPaletteUpdateChangesOnlyProvidedValues() {
        ColorPalette palette = new ColorPalette(1, "Dusk", "field", "light", "dark");

        ColorPalette result = palette.withOptionalUpdate(new UpdateColorPalette(null, "new-field", null, "new-dark"));

        assertThat(result).isSameAs(palette);
        assertThat(palette.getName()).isEqualTo("Dusk");
        assertThat(palette.getField()).isEqualTo("new-field");
        assertThat(palette.getInkLight()).isEqualTo("light");
        assertThat(palette.getInkDark()).isEqualTo("new-dark");
    }

    @Test
    void glasswareUpdateChangesOnlyProvidedValues() {
        Glassware glassware = new Glassware(2, "Pint", "g", "l", "f");

        Glassware result = glassware.withOptionalUpdate(new UpdateGlassware("Goblet", null, "new-l", null));

        assertThat(result).isSameAs(glassware);
        assertThat(glassware.getName()).isEqualTo("Goblet");
        assertThat(glassware.getG()).isEqualTo("g");
        assertThat(glassware.getL()).isEqualTo("new-l");
        assertThat(glassware.getF()).isEqualTo("f");
    }
}

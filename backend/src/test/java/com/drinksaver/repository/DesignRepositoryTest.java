package com.drinksaver.repository;

import com.drinksaver.model.db.ColorPalette;
import com.drinksaver.model.db.Glassware;
import com.drinksaver.model.dto.NewColorPalette;
import com.drinksaver.model.dto.NewGlassware;
import com.drinksaver.model.dto.UpdateColorPalette;
import com.drinksaver.model.dto.UpdateGlassware;
import com.drinksaver.repository.schema.ColorPalettesTable;
import com.drinksaver.repository.schema.GlasswareTable;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DesignRepositoryTest {

    @Mock
    private ColorPalettesTable colorPalettesTable;
    @Mock
    private GlasswareTable glasswareTable;
    @InjectMocks
    private DesignRepository designRepository;

    @Test
    void listsColorPalettes() {
        List<ColorPalette> palettes = List.of(new ColorPalette());
        when(colorPalettesTable.findAll()).thenReturn(palettes);

        assertThat(designRepository.getAvailableColorPalettes()).isSameAs(palettes);
    }

    @Test
    void savesColorPaletteFromRequest() {
        NewColorPalette request = new NewColorPalette("Dusk", "#111", "#eee", "#000");
        when(colorPalettesTable.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        ColorPalette saved = designRepository.saveColorPalette(request);

        assertThat(saved.getName()).isEqualTo("Dusk");
        assertThat(saved.getField()).isEqualTo("#111");
        assertThat(saved.getInkLight()).isEqualTo("#eee");
        assertThat(saved.getInkDark()).isEqualTo("#000");
        verify(colorPalettesTable).save(saved);
    }

    @Test
    void updatesExistingColorPaletteAndLeavesMissingOneAbsent() {
        ColorPalette palette = new ColorPalette(3, "Dusk", "#111", "#eee", "#000");
        when(colorPalettesTable.findById(3)).thenReturn(Optional.of(palette));
        when(colorPalettesTable.findById(9)).thenReturn(Optional.empty());

        assertThat(designRepository.updateColorPalette(3, new UpdateColorPalette("Night", null, null, null)))
            .containsSame(palette);
        assertThat(palette.getName()).isEqualTo("Night");
        assertThat(designRepository.updateColorPalette(9, new UpdateColorPalette(null, null, null, null))).isEmpty();
        verify(colorPalettesTable, never()).save(any());
    }

    @Test
    void deletesColorPaletteOnlyWhenItExists() {
        when(colorPalettesTable.existsById(3)).thenReturn(true);
        when(colorPalettesTable.existsById(9)).thenReturn(false);

        assertThat(designRepository.deleteColorPalette(3)).isTrue();
        assertThat(designRepository.deleteColorPalette(9)).isFalse();
        verify(colorPalettesTable).deleteById(3);
        verify(colorPalettesTable, never()).deleteById(9);
    }

    @Test
    void listsGlassware() {
        List<Glassware> items = List.of(new Glassware());
        when(glasswareTable.findAll()).thenReturn(items);

        assertThat(designRepository.getAvailableGlasswareIcons()).isSameAs(items);
    }

    @Test
    void savesGlasswareFromRequest() {
        NewGlassware request = new NewGlassware("Pint", "<g/>", "<l/>", "<f/>");
        when(glasswareTable.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Glassware saved = designRepository.saveGlassware(request);

        assertThat(saved.getName()).isEqualTo("Pint");
        assertThat(saved.getG()).isEqualTo("<g/>");
        assertThat(saved.getL()).isEqualTo("<l/>");
        assertThat(saved.getF()).isEqualTo("<f/>");
        verify(glasswareTable).save(saved);
    }

    @Test
    void updatesExistingGlasswareAndLeavesMissingOneAbsent() {
        Glassware glassware = new Glassware(4, "Pint", "<g/>", "<l/>", null);
        when(glasswareTable.findById(4)).thenReturn(Optional.of(glassware));
        when(glasswareTable.findById(9)).thenReturn(Optional.empty());

        assertThat(designRepository.updateGlassware(4, new UpdateGlassware(null, null, null, "<f/>")))
            .containsSame(glassware);
        assertThat(glassware.getF()).isEqualTo("<f/>");
        assertThat(designRepository.updateGlassware(9, new UpdateGlassware(null, null, null, null))).isEmpty();
        verify(glasswareTable, never()).save(any());
    }

    @Test
    void deletesGlasswareOnlyWhenItExists() {
        when(glasswareTable.existsById(4)).thenReturn(true);
        when(glasswareTable.existsById(9)).thenReturn(false);

        assertThat(designRepository.deleteGlassware(4)).isTrue();
        assertThat(designRepository.deleteGlassware(9)).isFalse();
        verify(glasswareTable).deleteById(4);
        verify(glasswareTable, never()).deleteById(9);
    }
}

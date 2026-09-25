package com.drinksaver.repository;

import com.drinksaver.model.db.ColorPalette;
import com.drinksaver.model.db.Glassware;
import com.drinksaver.model.dto.NewColorPalette;
import com.drinksaver.model.dto.NewGlassware;
import com.drinksaver.model.dto.UpdateColorPalette;
import com.drinksaver.model.dto.UpdateGlassware;
import com.drinksaver.repository.schema.ColorPalettesTable;
import com.drinksaver.repository.schema.GlasswareTable;
import com.drinksaver.service.DesignService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DesignServiceTest {

    @Mock
    private ColorPalettesTable colorPalettesTable;
    @Mock
    private GlasswareTable glasswareTable;
    @InjectMocks
    private DesignService designService;

    @Test
    void listsColorPalettes() {
        List<ColorPalette> palettes = List.of(new ColorPalette());
        when(colorPalettesTable.findAll()).thenReturn(palettes);

        assertThat(designService.getAvailableColorPalettes()).isSameAs(palettes);
    }

    @Test
    void savesColorPaletteFromRequest() {
        NewColorPalette request = new NewColorPalette("Dusk", "#111", "#eee", "#000");
        when(colorPalettesTable.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        ColorPalette saved = designService.saveColorPalette(request);

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
        when(colorPalettesTable.save(palette)).thenReturn(palette);

        assertThat(designService.updateColorPalette(3, new UpdateColorPalette("Night", null, null, null)))
            .containsSame(palette);
        assertThat(palette.getName()).isEqualTo("Night");
        assertThat(designService.updateColorPalette(9, new UpdateColorPalette(null, null, null, null))).isEmpty();
        verify(colorPalettesTable).save(palette);
    }

    @Test
    void deletesColorPaletteOnlyWhenItExists() {
        when(colorPalettesTable.existsById(3)).thenReturn(true);
        when(colorPalettesTable.existsById(8)).thenReturn(true);
        when(colorPalettesTable.existsById(9)).thenReturn(false);
        doAnswer(invocation -> {
            if (invocation.<Integer>getArgument(0) == 8) throw new DataIntegrityViolationException("palette in use");
            return null;
        }).when(colorPalettesTable).deleteById(anyInt());

        assertThat(designService.deleteColorPalette(3)).isEqualTo(204);
        assertThat(designService.deleteColorPalette(8)).isEqualTo(409);
        assertThat(designService.deleteColorPalette(9)).isEqualTo(404);
        verify(colorPalettesTable).deleteById(3);
        verify(colorPalettesTable).deleteById(8);
        verify(colorPalettesTable, never()).deleteById(9);
    }

    @Test
    void listsGlassware() {
        List<Glassware> items = List.of(new Glassware());
        when(glasswareTable.findAll()).thenReturn(items);

        assertThat(designService.getAvailableGlasswareIcons()).isSameAs(items);
    }

    @Test
    void savesGlasswareFromRequest() {
        NewGlassware request = new NewGlassware("Pint", "<g/>", "<l/>", "<f/>");
        when(glasswareTable.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Glassware saved = designService.saveGlassware(request);

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
        when(glasswareTable.save(glassware)).thenReturn(glassware);

        assertThat(designService.updateGlassware(4, new UpdateGlassware(null, null, null, "<f/>")))
            .containsSame(glassware);
        assertThat(glassware.getF()).isEqualTo("<f/>");
        assertThat(designService.updateGlassware(9, new UpdateGlassware(null, null, null, null))).isEmpty();
        verify(glasswareTable).save(glassware);
    }

    @Test
    void deletesGlasswareOnlyWhenItExists() {
        when(glasswareTable.existsById(4)).thenReturn(true);
        when(glasswareTable.existsById(8)).thenReturn(true);
        when(glasswareTable.existsById(9)).thenReturn(false);
        doAnswer(invocation -> {
            if (invocation.<Integer>getArgument(0) == 8) throw new DataIntegrityViolationException("glassware in use");
            return null;
        }).when(glasswareTable).deleteById(anyInt());

        assertThat(designService.deleteGlassware(4)).isEqualTo(204);
        assertThat(designService.deleteGlassware(8)).isEqualTo(409);
        assertThat(designService.deleteGlassware(9)).isEqualTo(404);
        verify(glasswareTable).deleteById(4);
        verify(glasswareTable).deleteById(8);
        verify(glasswareTable, never()).deleteById(9);
    }
}

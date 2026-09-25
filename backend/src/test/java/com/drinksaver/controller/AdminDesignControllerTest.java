package com.drinksaver.controller;

import com.drinksaver.config.SecurityConfig;
import com.drinksaver.controller.admin.AdminDesignController;
import com.drinksaver.model.db.ColorPalette;
import com.drinksaver.model.db.Glassware;
import com.drinksaver.model.dto.NewColorPalette;
import com.drinksaver.model.dto.NewGlassware;
import com.drinksaver.model.dto.UpdateColorPalette;
import com.drinksaver.model.dto.UpdateGlassware;
import com.drinksaver.service.DesignService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.security.autoconfigure.SecurityAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminDesignController.class)
@ImportAutoConfiguration({
    SecurityAutoConfiguration.class,
    ServletWebSecurityAutoConfiguration.class,
    SecurityFilterAutoConfiguration.class
})
@Import(SecurityConfig.class)
class AdminDesignControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DesignService designService;

    @Test
    void listsColorPalettes() throws Exception {
        when(designService.getAvailableColorPalettes()).thenReturn(List.of(new ColorPalette(1, "Dusk", "#111", "#eee", "#000")));

        mockMvc.perform(get("/v1/admin/design/color-palettes").with(admin()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(1))
            .andExpect(jsonPath("$[0].name").value("Dusk"));
    }

    @Test
    void createsColorPalette() throws Exception {
        NewColorPalette request = new NewColorPalette("Dusk", "#111", "#eee", "#000");
        when(designService.saveColorPalette(request)).thenReturn(new ColorPalette(1, "Dusk", "#111", "#eee", "#000"));

        mockMvc.perform(post("/v1/admin/design/color-palette").with(admin())
                .contentType(APPLICATION_JSON)
                .content("{\"name\":\"Dusk\",\"field\":\"#111\",\"inkLight\":\"#eee\",\"inkDark\":\"#000\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1));

        verify(designService).saveColorPalette(request);
    }

    @Test
    void updatesColorPaletteOrReturnsNotFound() throws Exception {
        UpdateColorPalette update = new UpdateColorPalette("Night", null, null, "#fff");
        when(designService.updateColorPalette(1, update)).thenReturn(Optional.of(new ColorPalette(1, "Night", "#111", "#eee", "#fff")));

        mockMvc.perform(patch("/v1/admin/design/color-palette/1").with(admin())
                .contentType(APPLICATION_JSON).content("{\"name\":\"Night\",\"inkDark\":\"#fff\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Night"));

        when(designService.updateColorPalette(9, update)).thenReturn(Optional.empty());
        mockMvc.perform(patch("/v1/admin/design/color-palette/9").with(admin())
                .contentType(APPLICATION_JSON).content("{\"name\":\"Night\",\"inkDark\":\"#fff\"}"))
            .andExpect(status().isNotFound());
    }

    @Test
    void deletesColorPaletteOrReturnsNotFound() throws Exception {
        when(designService.deleteColorPalette(1)).thenReturn(204);
        when(designService.deleteColorPalette(8)).thenReturn(409);
        when(designService.deleteColorPalette(9)).thenReturn(404);

        mockMvc.perform(delete("/v1/admin/design/color-palette/1").with(admin())).andExpect(status().isNoContent());
        mockMvc.perform(delete("/v1/admin/design/color-palette/8").with(admin())).andExpect(status().isConflict());
        mockMvc.perform(delete("/v1/admin/design/color-palette/9").with(admin())).andExpect(status().isNotFound());
    }

    @Test
    void listsGlassware() throws Exception {
        when(designService.getAvailableGlasswareIcons()).thenReturn(List.of(new Glassware(2, "Pint", "<g/>", "<l/>", null)));

        mockMvc.perform(get("/v1/admin/design/glassware").with(admin()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(2))
            .andExpect(jsonPath("$[0].name").value("Pint"));
    }

    @Test
    void createsGlassware() throws Exception {
        NewGlassware request = new NewGlassware("Pint", "<g/>", "<l/>", null);
        when(designService.saveGlassware(request)).thenReturn(new Glassware(2, "Pint", "<g/>", "<l/>", null));

        mockMvc.perform(post("/v1/admin/design/glassware").with(admin())
                .contentType(APPLICATION_JSON).content("{\"name\":\"Pint\",\"g\":\"<g/>\",\"l\":\"<l/>\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(2));

        verify(designService).saveGlassware(request);
    }

    @Test
    void updatesGlasswareOrReturnsNotFound() throws Exception {
        UpdateGlassware update = new UpdateGlassware("Tall Pint", null, null, "<f/>");
        when(designService.updateGlassware(2, update)).thenReturn(Optional.of(new Glassware(2, "Tall Pint", "<g/>", "<l/>", "<f/>")));
        when(designService.updateGlassware(9, update)).thenReturn(Optional.empty());

        mockMvc.perform(patch("/v1/admin/design/glassware/2").with(admin())
                .contentType(APPLICATION_JSON).content("{\"name\":\"Tall Pint\",\"f\":\"<f/>\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Tall Pint"));
        mockMvc.perform(patch("/v1/admin/design/glassware/9").with(admin())
                .contentType(APPLICATION_JSON).content("{\"name\":\"Tall Pint\",\"f\":\"<f/>\"}"))
            .andExpect(status().isNotFound());
    }

    @Test
    void deletesGlasswareOrReturnsNotFound() throws Exception {
        when(designService.deleteGlassware(2)).thenReturn(204);
        when(designService.deleteGlassware(8)).thenReturn(409);
        when(designService.deleteGlassware(9)).thenReturn(404);

        mockMvc.perform(delete("/v1/admin/design/glassware/2").with(admin())).andExpect(status().isNoContent());
        mockMvc.perform(delete("/v1/admin/design/glassware/8").with(admin())).andExpect(status().isConflict());
        mockMvc.perform(delete("/v1/admin/design/glassware/9").with(admin())).andExpect(status().isNotFound());
    }

    private static RequestPostProcessor admin() {
        return jwt().authorities(new SimpleGrantedAuthority("GROUP_/admin"));
    }
}

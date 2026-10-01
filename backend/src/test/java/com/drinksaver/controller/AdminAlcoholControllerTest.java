package com.drinksaver.controller;

import com.drinksaver.config.SecurityConfig;
import com.drinksaver.controller.admin.AdminAlcoholController;
import com.drinksaver.controller.admin.AdminAlcoholUserController;
import com.drinksaver.model.db.AlcoholSubtype;
import com.drinksaver.model.db.AlcoholType;
import com.drinksaver.model.dto.patch.UpdateAlcoholSubtype;
import com.drinksaver.model.dto.patch.UpdateAlcoholType;
import com.drinksaver.repository.AlcoholRepository;
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

import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {AdminAlcoholController.class, AdminAlcoholUserController.class})
@ImportAutoConfiguration({
    SecurityAutoConfiguration.class,
    ServletWebSecurityAutoConfiguration.class,
    SecurityFilterAutoConfiguration.class
})
@Import(SecurityConfig.class)
class AdminAlcoholControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AlcoholRepository alcoholRepository;

    @Test
    void patchesAlcoholTypeOrReturnsNotFound() throws Exception {
        UpdateAlcoholType update = new UpdateAlcoholType("Wine", null, null, null);
        when(alcoholRepository.editAlcoholType(3, update)).thenReturn(Optional.of(new AlcoholType(UUID.randomUUID(), "Wine", null, null, null)));
        when(alcoholRepository.editAlcoholType(9, update)).thenReturn(Optional.empty());

        mockMvc.perform(patch("/v1/admin/alcohol/types/3").with(admin())
                .contentType(APPLICATION_JSON).content("{\"name\":\"Wine\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Wine"));
        mockMvc.perform(patch("/v1/admin/alcohol/types/9").with(admin())
                .contentType(APPLICATION_JSON).content("{\"name\":\"Wine\"}"))
            .andExpect(status().isNotFound());
        verify(alcoholRepository).editAlcoholType(3, update);
        verify(alcoholRepository).editAlcoholType(9, update);
    }

    @Test
    void patchesAlcoholSubtypeOrReturnsNotFound() throws Exception {
        UpdateAlcoholSubtype update = new UpdateAlcoholSubtype("Dry", null, null);
        when(alcoholRepository.editAlcoholSubtype(4, update)).thenReturn(Optional.of(new AlcoholSubtype(2, UUID.randomUUID(), "Dry")));
        when(alcoholRepository.editAlcoholSubtype(9, update)).thenReturn(Optional.empty());

        mockMvc.perform(patch("/v1/admin/alcohol/subtypes/4").with(admin())
                .contentType(APPLICATION_JSON).content("{\"name\":\"Dry\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Dry"));
        mockMvc.perform(patch("/v1/admin/alcohol/subtypes/9").with(admin())
                .contentType(APPLICATION_JSON).content("{\"name\":\"Dry\"}"))
            .andExpect(status().isNotFound());
        verify(alcoholRepository).editAlcoholSubtype(4, update);
        verify(alcoholRepository).editAlcoholSubtype(9, update);
    }

    @Test
    void deletesAlcoholTypesAndSubtypes() throws Exception {
        when(alcoholRepository.deleteAlcoholType(3)).thenReturn(204);
        when(alcoholRepository.deleteAlcoholType(9)).thenReturn(404);
        when(alcoholRepository.deleteAlcoholSubType(4)).thenReturn(409);

        mockMvc.perform(delete("/v1/admin/alcohol/types/3").with(admin())).andExpect(status().isNoContent());
        mockMvc.perform(delete("/v1/admin/alcohol/types/9").with(admin())).andExpect(status().isNotFound());
        mockMvc.perform(delete("/v1/admin/alcohol/subtypes/4").with(admin())).andExpect(status().isConflict());
        verify(alcoholRepository).deleteAlcoholType(3);
        verify(alcoholRepository).deleteAlcoholType(9);
        verify(alcoholRepository).deleteAlcoholSubType(4);
    }

    @Test
    void publishesAlcoholTypeAndSubtypeOrReturnsNotFound() throws Exception {
        AlcoholType type = new AlcoholType(UUID.randomUUID(), "Vodka", null, null, null);
        AlcoholSubtype subtype = new AlcoholSubtype(2, UUID.randomUUID(), "Clear");
        when(alcoholRepository.publishAlcoholType(3)).thenReturn(Optional.of(type));
        when(alcoholRepository.publishAlcoholType(9)).thenReturn(Optional.empty());
        when(alcoholRepository.publishAlcoholSubtype(4)).thenReturn(Optional.of(subtype));
        when(alcoholRepository.publishAlcoholSubtype(9)).thenReturn(Optional.empty());

        mockMvc.perform(post("/v1/admin/user-defined/alcohol/types/3/publish").with(admin()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Vodka"));
        mockMvc.perform(post("/v1/admin/user-defined/alcohol/types/9/publish").with(admin())).andExpect(status().isNotFound());
        mockMvc.perform(post("/v1/admin/user-defined/alcohol/subtypes/4/publish").with(admin()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Clear"));
        mockMvc.perform(post("/v1/admin/user-defined/alcohol/subtypes/9/publish").with(admin())).andExpect(status().isNotFound());
    }

    private static RequestPostProcessor admin() {
        return jwt().authorities(new SimpleGrantedAuthority("GROUP_/admin"));
    }
}

package com.drinksaver.controller;

import com.drinksaver.config.SecurityConfig;
import com.drinksaver.controller.admin.AdminAlcoholController;
import com.drinksaver.controller.admin.AdminAlcoholDefaultController;
import com.drinksaver.controller.admin.AdminAlcoholUserController;
import com.drinksaver.model.db.AlcoholSubtype;
import com.drinksaver.model.db.AlcoholType;
import com.drinksaver.model.dto.patch.UpdateAlcoholSubtype;
import com.drinksaver.model.dto.patch.UpdateAlcoholType;
import com.drinksaver.model.dto.post.NewAlcoholEntry;
import com.drinksaver.model.dto.post.NewAlcoholSubtype;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
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
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {AdminAlcoholController.class, AdminAlcoholUserController.class, AdminAlcoholDefaultController.class})
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
    void createsDefaultAlcoholTypeWithoutBindingClientUserId() throws Exception {
        NewAlcoholEntry entry = new NewAlcoholEntry(null, "Wine", null, List.of("Dry"), 2, 3);
        when(alcoholRepository.createAdminAlcoholType(entry))
            .thenReturn(new AlcoholType(UUID.randomUUID(), "Wine", List.of(), 2, 3));

        mockMvc.perform(post("/v1/admin/default/alcohol/types").with(admin()).contentType(APPLICATION_JSON)
                .content("""
                    {"userId":"00000000-0000-0000-0000-000000000099","name":"Wine",
                     "alcoholSubtypes":["Dry"],"colorPaletteId":2,"glasswareId":3}
                    """))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Wine"))
            .andExpect(jsonPath("$.colorPaletteId").value(2))
            .andExpect(jsonPath("$.glasswareId").value(3));
        verify(alcoholRepository).createAdminAlcoholType(entry);
    }

    @Test
    void createsDefaultSubtypeUsingPathParentWithoutBindingClientUserId() throws Exception {
        NewAlcoholSubtype entry = new NewAlcoholSubtype(99, null, "Dry", 2, 3);
        when(alcoholRepository.saveAdminSubtypeForAlcoholType(7, entry))
            .thenReturn(new AlcoholSubtype(7, UUID.randomUUID(), "Dry", 2, 3));

        mockMvc.perform(post("/v1/admin/default/alcohol/types/7/subtypes").with(admin()).contentType(APPLICATION_JSON)
                .content("""
                    {"alcoholTypeId":99,"userId":"00000000-0000-0000-0000-000000000099",
                     "name":"Dry","colorPaletteId":2,"glasswareId":3}
                    """))
            .andExpect(status().isOk()).andExpect(jsonPath("$.alcoholTypeId").value(7))
            .andExpect(jsonPath("$.name").value("Dry"))
            .andExpect(jsonPath("$.colorPaletteId").value(2))
            .andExpect(jsonPath("$.glasswareId").value(3));
        verify(alcoholRepository).saveAdminSubtypeForAlcoholType(7, entry);
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
        "types|{\"name\":\"Wine\",\"glasswareId\":3}",
        "types|{\"name\":\"Wine\",\"colorPaletteId\":2}",
        "types/7/subtypes|{\"name\":\"Dry\",\"colorPaletteId\":2,\"glasswareId\":3}",
        "types/7/subtypes|{\"alcoholTypeId\":7,\"colorPaletteId\":2,\"glasswareId\":3}",
        "types/7/subtypes|{\"alcoholTypeId\":7,\"name\":\"Dry\",\"glasswareId\":3}",
        "types/7/subtypes|{\"alcoholTypeId\":7,\"name\":\"Dry\",\"colorPaletteId\":2}"
    })
    void rejectsInvalidDefaultEntriesBeforeCallingRepository(String path, String body) throws Exception {
        mockMvc.perform(post("/v1/admin/default/alcohol/" + path).with(admin())
                .contentType(APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest());
        verifyNoInteractions(alcoholRepository);
    }

    @ParameterizedTest
    @CsvSource({"types", "types/7/subtypes"})
    void defaultCreationRequiresAnAuthenticatedAdmin(String path) throws Exception {
        mockMvc.perform(post("/v1/admin/default/alcohol/" + path).with(csrf()).contentType(APPLICATION_JSON).content("{}"))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/v1/admin/default/alcohol/" + path).with(jwt())
                .contentType(APPLICATION_JSON).content("{}"))
            .andExpect(status().isForbidden());
        verifyNoInteractions(alcoholRepository);
    }

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

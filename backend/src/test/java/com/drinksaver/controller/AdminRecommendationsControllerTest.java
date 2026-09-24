package com.drinksaver.controller;

import com.drinksaver.config.SecurityConfig;
import com.drinksaver.controller.admin.AdminRecommendationsController;
import com.drinksaver.model.db.admin.DefaultRecommendation;
import com.drinksaver.model.dto.NewDefaultRecommendation;
import com.drinksaver.model.dto.RecommendationUpdate;
import com.drinksaver.repository.AdminRecommendationsRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
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

/**
 * Slice test for {@link AdminRecommendationsController}. Admin access itself is pinned in
 * {@link AdminAuthorizationTest}; here the caller is simply granted the admin authority.
 */
@WebMvcTest(AdminRecommendationsController.class)
@ImportAutoConfiguration({
    SecurityAutoConfiguration.class,
    ServletWebSecurityAutoConfiguration.class,
    SecurityFilterAutoConfiguration.class
})
@Import(SecurityConfig.class)
class AdminRecommendationsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminRecommendationsRepository adminRecommendationsRepository;

    @Test
    void deletingAnExistingRecommendationReturnsOk() throws Exception {
        when(adminRecommendationsRepository.deleteRecommendation(7)).thenReturn(true);

        mockMvc.perform(delete("/v1/admin/recommendations/7").with(admin()))
            .andExpect(status().isOk());
    }

    @Test
    void deletingAMissingRecommendationReturnsNotFound() throws Exception {
        when(adminRecommendationsRepository.deleteRecommendation(7)).thenReturn(false);

        mockMvc.perform(delete("/v1/admin/recommendations/7").with(admin()))
            .andExpect(status().isNotFound());
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "{\"name\": \"Heineken\", \"alcoholTypeId\": 4, \"colorPaletteId\": null, \"glasswareId\": 1}",
        "{\"name\": \"Heineken\", \"alcoholTypeId\": 4, \"colorPaletteId\": 3, \"glasswareId\": null}"
    })
    void creatingWithoutPaletteOrGlasswareIsRejected(String body) throws Exception {
        mockMvc.perform(post("/v1/admin/recommendations").with(admin())
                .contentType(APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest());

        verify(adminRecommendationsRepository, never()).addRecommendation(any());
    }

    @Test
    void listReturnsTheRecommendations() throws Exception {
        when(adminRecommendationsRepository.getRecommendations()).thenReturn(List.of(recommendation(1, "Heineken")));

        mockMvc.perform(get("/v1/admin/recommendations/list").with(admin()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(1))
            .andExpect(jsonPath("$[0].name").value("Heineken"));
    }

    @Test
    void editPassesTheUpdatesThroughAndReturnsTheNewList() throws Exception {
        List<RecommendationUpdate> updates = List.of(new RecommendationUpdate(2, "Two"), new RecommendationUpdate(1, "One"));
        when(adminRecommendationsRepository.updateRecommendations(updates))
            .thenReturn(List.of(recommendation(2, "Two"), recommendation(1, "One")));

        mockMvc.perform(patch("/v1/admin/recommendations/edit").with(admin())
                .contentType(APPLICATION_JSON)
                .content("[{\"id\": 2, \"name\": \"Two\"}, {\"id\": 1, \"name\": \"One\"}]"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(2))
            .andExpect(jsonPath("$[1].id").value(1));
    }

    @Test
    void createReturnsTheSavedRecommendation() throws Exception {
        NewDefaultRecommendation request = new NewDefaultRecommendation("Heineken", 4, null, null, null, null, null, 3, 1);
        when(adminRecommendationsRepository.addRecommendation(request)).thenReturn(recommendation(7, "Heineken"));

        mockMvc.perform(post("/v1/admin/recommendations").with(admin())
                .contentType(APPLICATION_JSON)
                .content("{\"name\": \"Heineken\", \"alcoholTypeId\": 4, \"colorPaletteId\": 3, \"glasswareId\": 1}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(7));
    }

    private static DefaultRecommendation recommendation(int id, String name) {
        DefaultRecommendation recommendation = new DefaultRecommendation();
        recommendation.setId(id);
        recommendation.setName(name);
        return recommendation;
    }

    private static RequestPostProcessor admin() {
        return jwt().authorities(new SimpleGrantedAuthority("GROUP_/admin"));
    }
}

package com.drinksaver.controller;

import com.drinksaver.config.SecurityConfig;
import com.drinksaver.model.db.Recommendation;
import com.drinksaver.model.dto.RecommendationUpdate;
import com.drinksaver.service.RecommendationCacheService;
import com.drinksaver.service.RecommendationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.security.autoconfigure.SecurityAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Slice test for {@link RecommendationsController}. The controller is a thin pass-through
 * to {@link RecommendationService}, so the only behaviour worth pinning here is the HTTP
 * contract: authentication, path variable validation and the JSON shape of the response.
 *
 * {@link SecurityConfig} is imported explicitly because {@code @WebMvcTest} only picks up
 * controllers, converters, filters and similar web-layer beans by default; a regular
 * {@code @Configuration} class defining the {@code SecurityFilterChain} bean is not part of
 * that slice unless imported, and without it every request would sail through unauthenticated.
 * The three {@code @ImportAutoConfiguration} classes supply the {@code HttpSecurity} bean and
 * the {@code @EnableWebSecurity} wiring that {@link SecurityConfig}'s {@code securityFilterChain}
 * bean method needs; {@code @WebMvcTest} does not pull those in on its own either, since Spring
 * Security's own autoconfiguration classes are not on its per-slice inclusion list.
 */
@WebMvcTest(RecommendationsController.class)
@ImportAutoConfiguration({
    SecurityAutoConfiguration.class,
    ServletWebSecurityAutoConfiguration.class,
    SecurityFilterAutoConfiguration.class
})
@Import(SecurityConfig.class)
class RecommendationsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RecommendationService recommendationService;

    @MockitoBean
    private RecommendationCacheService recommendationCacheService;

    @Test
    void getRecommendationsListReturnsOkWithExpectedShape() throws Exception {
        UUID userId = UUID.randomUUID();
        Recommendation recommendation = new Recommendation();
        recommendation.setId(1);
        recommendation.setUserId(userId);
        recommendation.setName("Heineken (33cl)");
        recommendation.setAlcoholTypeId(4);
        recommendation.setAlcoholSubtypeId(null);
        recommendation.setAlcoholVolumeId(2);
        recommendation.setBrandId(3);
        recommendation.setBeerFlavourId(null);
        recommendation.setConsumptionTypeId(1);
        recommendation.setEndDate(null);

        when(recommendationService.getRecommendations(userId)).thenReturn(List.of(recommendation));

        mockMvc.perform(get("/v1/recommendations/list")
                .with(jwt().jwt(token -> token.subject(userId.toString()))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", org.hamcrest.Matchers.hasSize(1)))
            .andExpect(jsonPath("$[0].id").value(1))
            .andExpect(jsonPath("$[0].userId").value(userId.toString()))
            .andExpect(jsonPath("$[0].name").value("Heineken (33cl)"))
            .andExpect(jsonPath("$[0].alcoholTypeId").value(4))
            .andExpect(jsonPath("$[0].alcoholVolumeId").value(2))
            .andExpect(jsonPath("$[0].brandId").value(3))
            .andExpect(jsonPath("$[0].consumptionTypeId").value(1));
    }

    @Test
    void getRecommendationsListWithoutTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/v1/recommendations/list"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void getRecommendationsListUsesTheAuthenticatedUserIdNotAClientSuppliedOne() throws Exception {
        UUID authenticatedUserId = UUID.randomUUID();

        when(recommendationService.getRecommendations(authenticatedUserId)).thenReturn(List.of());

        mockMvc.perform(get("/v1/recommendations/list")
                .with(jwt().jwt(token -> token.subject(authenticatedUserId.toString()))))
            .andExpect(status().isOk());

        org.mockito.Mockito.verify(recommendationService).getRecommendations(authenticatedUserId);
    }

    @Test
    void reorderRecommendationsReturnsCountAndForwardsOnlyOwnedUpdates() throws Exception {
        UUID userId = UUID.randomUUID();
        Recommendation owned = recommendation(25, userId, "Owned");
        Recommendation otherUser = recommendation(27, UUID.randomUUID(), "Other");
        when(recommendationService.getRecommendations(userId)).thenReturn(List.of(owned, otherUser));
        when(recommendationService.updateRecommendationsOrder(eq(userId), any())).thenReturn(1);

        mockMvc.perform(patch("/v1/recommendations/edit")
                .with(jwt().jwt(token -> token.subject(userId.toString())))
                .contentType(APPLICATION_JSON)
                .content("[{\"id\":25,\"name\":\"Renamed\"},{\"id\":27,\"name\":\"Ignored\"}]"))
            .andExpect(status().isOk())
            .andExpect(content().string("1"));

        verify(recommendationService).updateRecommendationsOrder(
                userId,
                List.of(new RecommendationUpdate(25, "Renamed"))
        );
    }

    @Test
    void reorderRecommendationsWithoutTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(patch("/v1/recommendations/edit")
                .with(csrf())
                .contentType(APPLICATION_JSON)
                .content("[]"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteRecommendationDeletesAnOwnedRecommendation() throws Exception {
        UUID userId = UUID.randomUUID();
        when(recommendationService.isRecommendationOwnedByUser(25, userId)).thenReturn(true);

        mockMvc.perform(delete("/v1/recommendations/25")
                .with(jwt().jwt(token -> token.subject(userId.toString()))))
            .andExpect(status().isOk());

        verify(recommendationService).deleteRecommendation(25);
    }

    @Test
    void deleteRecommendationRejectsAnUnownedRecommendation() {
        UUID userId = UUID.randomUUID();
        when(recommendationService.isRecommendationOwnedByUser(25, userId)).thenReturn(false);
        Jwt token = Jwt.withTokenValue("token").subject(userId.toString()).header("alg", "none").build();

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> new RecommendationsController(recommendationService, recommendationCacheService)
                .deleteRecommendation(token, 25))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("That recommendation is not owned by the authenticated user");
        org.mockito.Mockito.verify(recommendationService, never()).deleteRecommendation(25);
    }

    private Recommendation recommendation(Integer id, UUID userId, String name) {
        Recommendation recommendation = new Recommendation();
        recommendation.setId(id);
        recommendation.setUserId(userId);
        recommendation.setName(name);
        return recommendation;
    }
}

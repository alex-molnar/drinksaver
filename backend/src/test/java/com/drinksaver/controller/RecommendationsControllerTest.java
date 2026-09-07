package com.drinksaver.controller;

import com.drinksaver.config.SecurityConfig;
import com.drinksaver.model.db.Recommendation;
import com.drinksaver.service.RecommendationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.security.autoconfigure.SecurityAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

        mockMvc.perform(get("/v1/recommendations/{userId}/list", userId).with(jwt()))
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
        mockMvc.perform(get("/v1/recommendations/{userId}/list", UUID.randomUUID()))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void getRecommendationsListWithMalformedUserIdReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/v1/recommendations/{userId}/list", "not-a-uuid").with(jwt()))
            .andExpect(status().isBadRequest());

        // The malformed path variable must fail before the service is ever consulted.
        org.mockito.Mockito.verifyNoInteractions(recommendationService);
    }
}

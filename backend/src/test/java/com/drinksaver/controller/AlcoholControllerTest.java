package com.drinksaver.controller;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.config.SecurityConfig;
import com.drinksaver.model.db.AlcoholType;
import com.drinksaver.repository.AlcoholRepository;
import com.drinksaver.repository.BeerRepository;
import com.drinksaver.repository.DrinksRepository;
import com.drinksaver.service.InjectorService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.security.autoconfigure.SecurityAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Slice test for {@link AlcoholController}. The controller obtains its {@link AlcoholRepository}
 * from {@link InjectorService} rather than by direct injection, so {@link TestConfig} builds a
 * real {@code InjectorService} around a {@code @MockitoBean} repository instead of mocking
 * {@code InjectorService} itself. That real instance resolves the repository via
 * {@code InjectorService}'s own {@code is(name)} matching, which happens while the
 * {@code AlcoholController} bean is being constructed during context refresh, before any
 * per-test {@code @BeforeEach} stubbing would run — mocking {@code InjectorService} directly and
 * stubbing its getters only in test methods would be too late for that first call.
 *
 * See {@link RecommendationsControllerTest} for why {@link SecurityConfig} and the
 * {@code @ImportAutoConfiguration} classes are both needed to get real security behaviour.
 *
 * {@code AlcoholController} has no UUID path variable (its only path variable,
 * {@code alcoholTypeId}, is an {@code Integer}), so the malformed-path-variable test exercises
 * that Integer conversion instead; the principle being verified — a path variable that fails to
 * convert to its declared type yields 400 — is the same one the plan describes for the other
 * controllers' UUID path variables.
 */
@WebMvcTest(AlcoholController.class)
@ImportAutoConfiguration({
    SecurityAutoConfiguration.class,
    ServletWebSecurityAutoConfiguration.class,
    SecurityFilterAutoConfiguration.class
})
@Import({SecurityConfig.class, AlcoholControllerTest.TestConfig.class})
class AlcoholControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AlcoholRepository alcoholRepository;

    @TestConfiguration
    static class TestConfig {
        @Bean
        InjectorService injectorService(AlcoholRepository alcoholRepository) {
            when(alcoholRepository.is(any())).thenReturn(true);
            RepositoryConfiguration config = new RepositoryConfiguration(
                "mock", "mock", "mock", "mock", List.of(), 4, 10, 0.97
            );
            return new InjectorService(
                Map.of("alcohol", alcoholRepository),
                Map.of("beer", org.mockito.Mockito.mock(BeerRepository.class)),
                Map.of("drinks", org.mockito.Mockito.mock(DrinksRepository.class)),
                config
            );
        }
    }

    @Test
    void getAlcoholTypesReturnsOkWithExpectedShape() throws Exception {
        UUID userId = UUID.randomUUID();
        AlcoholType type = new AlcoholType(userId, "Beer", List.of(1, 2));
        type.setId(4);

        when(alcoholRepository.getAlcoholTypes(userId)).thenReturn(List.of(type));

        mockMvc.perform(get("/v1/alcohol/types").param("userId", userId.toString()).with(jwt()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(4))
            .andExpect(jsonPath("$[0].name").value("Beer"))
            .andExpect(jsonPath("$[0].userId").value(userId.toString()))
            .andExpect(jsonPath("$[0].volumeIds").isArray())
            .andExpect(jsonPath("$[0].volumeIds[0]").value(1))
            .andExpect(jsonPath("$[0].volumeIds[1]").value(2));
    }

    @Test
    void getAlcoholTypesWithoutTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/v1/alcohol/types").param("userId", UUID.randomUUID().toString()))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void getVolumesByAlcoholTypeWithMalformedTypeIdReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/v1/alcohol/types/{alcoholTypeId}/volumes", "not-an-integer").with(jwt()))
            .andExpect(status().isBadRequest());

        verifyNoInteractions(alcoholRepository);
    }
}

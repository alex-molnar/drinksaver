package com.drinksaver.controller;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.config.SecurityConfig;
import com.drinksaver.model.db.AlcoholSubtype;
import com.drinksaver.model.db.AlcoholType;
import com.drinksaver.model.db.AlcoholVolume;
import com.drinksaver.model.dto.NewAlcoholEntry;
import com.drinksaver.model.dto.NewAlcoholSubtype;
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
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
                "mock", "mock", "mock", "mock", "mock", List.of(), 4, 10, 0.97
            );
            return new InjectorService(
                Map.of("alcohol", alcoholRepository),
                Map.of("beer", org.mockito.Mockito.mock(BeerRepository.class)),
                Map.of("drinks", org.mockito.Mockito.mock(DrinksRepository.class)),
                Map.of(),
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

        mockMvc.perform(get("/v1/alcohol/types")
                .with(jwt().jwt(token -> token.subject(userId.toString()))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(4))
            .andExpect(jsonPath("$[0].name").value("Beer"))
            .andExpect(jsonPath("$[0].userId").value(userId.toString()))
            .andExpect(jsonPath("$[0].volumeIds").isArray())
            .andExpect(jsonPath("$[0].volumeIds[0]").value(1))
            .andExpect(jsonPath("$[0].volumeIds[1]").value(2));
    }

    @Test
    void getAlcoholTypesIgnoresClientSuppliedUserIdParamAndUsesJwtSubject() throws Exception {
        UUID authenticatedUserId = UUID.randomUUID();
        UUID spoofedUserId = UUID.randomUUID();

        when(alcoholRepository.getAlcoholTypes(authenticatedUserId)).thenReturn(List.of());

        mockMvc.perform(get("/v1/alcohol/types")
                .param("userId", spoofedUserId.toString())
                .with(jwt().jwt(token -> token.subject(authenticatedUserId.toString()))))
            .andExpect(status().isOk());

        verify(alcoholRepository).getAlcoholTypes(authenticatedUserId);
    }

    @Test
    void getAlcoholTypesWithoutTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/v1/alcohol/types"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void getVolumesByAlcoholTypeWithMalformedTypeIdReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/v1/alcohol/types/{alcoholTypeId}/volumes", "not-an-integer").with(jwt()))
            .andExpect(status().isBadRequest());

        verifyNoInteractions(alcoholRepository);
    }

    @Test
    void getSubtypesByAlcoholTypeUsesJwtSubjectNotClientSuppliedUserIdParam() throws Exception {
        UUID authenticatedUserId = UUID.randomUUID();
        UUID spoofedUserId = UUID.randomUUID();

        when(alcoholRepository.getSubtypesByAlcoholType(4, authenticatedUserId)).thenReturn(List.of());

        mockMvc.perform(get("/v1/alcohol/types/{alcoholTypeId}/subtypes", 4)
                .param("userId", spoofedUserId.toString())
                .with(jwt().jwt(token -> token.subject(authenticatedUserId.toString()))))
            .andExpect(status().isOk());

        verify(alcoholRepository).getSubtypesByAlcoholType(4, authenticatedUserId);
    }

    @Test
    void createSubtypeForAlcoholTypeIgnoresClientSuppliedUserIdAndUsesJwtSubject() throws Exception {
        UUID authenticatedUserId = UUID.randomUUID();
        UUID spoofedUserId = UUID.randomUUID();

        when(alcoholRepository.saveSubtypeForAlcoholType(any(), any()))
            .thenReturn(new AlcoholSubtype(4, authenticatedUserId, "IPA"));

        mockMvc.perform(post("/v1/alcohol/types/{alcoholTypeId}/subtypes", 4)
                .with(jwt().jwt(token -> token.subject(authenticatedUserId.toString())))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"alcoholTypeId\":4,\"userId\":\"%s\",\"name\":\"IPA\"}".formatted(spoofedUserId)))
            .andExpect(status().isOk());

        org.mockito.ArgumentCaptor<NewAlcoholSubtype> captor = org.mockito.ArgumentCaptor.forClass(NewAlcoholSubtype.class);
        verify(alcoholRepository).saveSubtypeForAlcoholType(org.mockito.ArgumentMatchers.eq(4), captor.capture());
        assertThat(captor.getValue().userId()).isEqualTo(authenticatedUserId);
    }

    @Test
    void createAlcoholTypeIgnoresClientSuppliedUserIdAndUsesJwtSubject() throws Exception {
        UUID authenticatedUserId = UUID.randomUUID();
        UUID spoofedUserId = UUID.randomUUID();

        when(alcoholRepository.createAlcoholType(any()))
            .thenReturn(new AlcoholType(authenticatedUserId, "Beer", List.of()));

        mockMvc.perform(post("/v1/alcohol/types")
                .with(jwt().jwt(token -> token.subject(authenticatedUserId.toString())))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"userId\":\"%s\",\"name\":\"Beer\",\"volumes\":[],\"alcoholSubtypes\":[]}".formatted(spoofedUserId)))
            .andExpect(status().isOk());

        org.mockito.ArgumentCaptor<NewAlcoholEntry> captor = org.mockito.ArgumentCaptor.forClass(NewAlcoholEntry.class);
        verify(alcoholRepository).createAlcoholType(captor.capture());
        assertThat(captor.getValue().userId()).isEqualTo(authenticatedUserId);
    }

    /**
     * F7. `saveVolumeForAlcoholType` used to answer an unknown alcohol type with a 200
     * carrying an all-null AlcoholVolume, so a client could not tell success from
     * failure. The author had flagged it with a `// TODO ResponseEntity 404`.
     */
    @Test
    void saveVolumeForAnUnknownAlcoholTypeReturnsNotFound() throws Exception {
        when(alcoholRepository.saveVolumeForAlcoholType(eq(99), any())).thenReturn(Optional.empty());

        mockMvc.perform(post("/v1/alcohol/types/{alcoholTypeId}/volumes", 99)
                .with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Shot\",\"volume\":0.05}"))
            .andExpect(status().isNotFound());
    }

    @Test
    void saveVolumeForAKnownAlcoholTypeReturnsTheSavedVolume() throws Exception {
        AlcoholVolume saved = new AlcoholVolume(1, "Shot", 0.05f);
        saved.setId(8);
        when(alcoholRepository.saveVolumeForAlcoholType(eq(1), any())).thenReturn(Optional.of(saved));

        mockMvc.perform(post("/v1/alcohol/types/{alcoholTypeId}/volumes", 1)
                .with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Shot\",\"volume\":0.05}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(8))
            .andExpect(jsonPath("$.name").value("Shot"));
    }

    /**
     * createAlcoholType is @Transactional and saves the volumes and subtypes one row at
     * a time, so an unbounded list means one request holds a pooled connection for the
     * whole loop. The bounds exist to stop that, and the endpoint needs @Valid for them
     * to be enforced at all.
     */
    @Test
    void createAlcoholTypeRejectsAnOverlongVolumeList() throws Exception {
        String volumes = java.util.stream.IntStream.rangeClosed(1, 51)
            .mapToObj(i -> "{\"name\":\"v" + i + "\",\"volume\":0.1}")
            .collect(java.util.stream.Collectors.joining(","));

        mockMvc.perform(post("/v1/alcohol/types")
                .with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Gin\",\"volumes\":[" + volumes + "],\"alcoholSubtypes\":[]}"))
            .andExpect(status().isBadRequest());

        verifyNoInteractions(alcoholRepository);
    }

    @Test
    void createAlcoholTypeRejectsAnOverlongSubtypeList() throws Exception {
        String subtypes = java.util.stream.IntStream.rangeClosed(1, 51)
            .mapToObj(i -> "\"s" + i + "\"")
            .collect(java.util.stream.Collectors.joining(","));

        mockMvc.perform(post("/v1/alcohol/types")
                .with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Gin\",\"volumes\":[],\"alcoholSubtypes\":[" + subtypes + "]}"))
            .andExpect(status().isBadRequest());

        verifyNoInteractions(alcoholRepository);
    }

    @Test
    void createAlcoholTypeAcceptsListsAtTheLimit() throws Exception {
        String volumes = java.util.stream.IntStream.rangeClosed(1, 50)
            .mapToObj(i -> "{\"name\":\"v" + i + "\",\"volume\":0.1}")
            .collect(java.util.stream.Collectors.joining(","));
        UUID userId = UUID.randomUUID();
        when(alcoholRepository.createAlcoholType(any()))
            .thenReturn(new AlcoholType(userId, "Gin", List.of()));

        // A UUID subject, not the bare jwt() default of "user": this endpoint derives the
        // owner from the subject, so a non-UUID one is a 500 rather than a validation error.
        mockMvc.perform(post("/v1/alcohol/types")
                .with(jwt().jwt(token -> token.subject(userId.toString())))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Gin\",\"volumes\":[" + volumes + "],\"alcoholSubtypes\":[]}"))
            .andExpect(status().isOk());
    }
}

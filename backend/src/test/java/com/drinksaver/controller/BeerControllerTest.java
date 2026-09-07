package com.drinksaver.controller;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.config.SecurityConfig;
import com.drinksaver.model.db.Brand;
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
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Slice test for {@link BeerController}. See {@link AlcoholControllerTest} for why the
 * {@link InjectorService} is built as a real instance around a {@code @MockitoBean} repository
 * rather than mocked directly, and {@link RecommendationsControllerTest} for why
 * {@link SecurityConfig} and the {@code @ImportAutoConfiguration} classes are both needed.
 */
@WebMvcTest(BeerController.class)
@ImportAutoConfiguration({
    SecurityAutoConfiguration.class,
    ServletWebSecurityAutoConfiguration.class,
    SecurityFilterAutoConfiguration.class
})
@Import({SecurityConfig.class, BeerControllerTest.TestConfig.class})
class BeerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BeerRepository beerRepository;

    @TestConfiguration
    static class TestConfig {
        @Bean
        InjectorService injectorService(BeerRepository beerRepository) {
            when(beerRepository.is(any())).thenReturn(true);
            RepositoryConfiguration config = new RepositoryConfiguration(
                "mock", "mock", "mock", "mock", List.of(), 4, 10, 0.97
            );
            return new InjectorService(
                Map.of("alcohol", org.mockito.Mockito.mock(AlcoholRepository.class)),
                Map.of("beer", beerRepository),
                Map.of("drinks", org.mockito.Mockito.mock(DrinksRepository.class)),
                config
            );
        }
    }

    @Test
    void getBrandsListReturnsOkWithExpectedShape() throws Exception {
        UUID userId = UUID.randomUUID();
        Brand brand = new Brand(userId, "Heineken");
        brand.setId(7);

        when(beerRepository.getBrands(userId)).thenReturn(List.of(brand));

        mockMvc.perform(get("/v1/beer/brands").param("userId", userId.toString()).with(jwt()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(7))
            .andExpect(jsonPath("$[0].name").value("Heineken"))
            .andExpect(jsonPath("$[0].userId").value(userId.toString()));
    }

    @Test
    void getBrandsListWithoutTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/v1/beer/brands").param("userId", UUID.randomUUID().toString()))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void saveBrandWithMalformedUserIdReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/v1/beer/{userId}/brands", "not-a-uuid")
                .with(jwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Heineken\",\"flavours\":[]}"))
            .andExpect(status().isBadRequest());

        verifyNoInteractions(beerRepository);
    }
}

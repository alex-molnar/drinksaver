package com.drinksaver.controller;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.config.SecurityConfig;
import com.drinksaver.model.db.SavedDrink;
import com.drinksaver.model.dto.Drink;
import com.drinksaver.repository.AlcoholRepository;
import com.drinksaver.repository.BeerRepository;
import com.drinksaver.repository.DrinksRepository;
import com.drinksaver.service.InjectorService;
import com.drinksaver.service.RecommendationCacheService;
import com.drinksaver.service.model.DrinkKey;
import com.drinksaver.service.namecollector.AlcoholNameCollector;
import com.drinksaver.service.namecollector.BeerNameCollector;
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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Slice test for {@link DrinksController}. See {@link AlcoholControllerTest} for why the
 * {@link InjectorService} is built as a real instance around a {@code @MockitoBean} repository
 * rather than mocked directly, and {@link RecommendationsControllerTest} for why
 * {@link SecurityConfig} and the {@code @ImportAutoConfiguration} classes are both needed.
 *
 * {@code beerId} is fixed at 4 here (matching {@code repository.beer-id} in
 * src/test/resources/application.yaml) so the two {@code getSavedDrinks} tests can drive the
 * beer-vs-alcohol name collector branch deterministically: a saved drink whose
 * {@code alcoholTypeId} equals 4 must go through {@link BeerNameCollector}, anything else
 * through {@link AlcoholNameCollector}.
 *
 * None of these endpoints take a {@code userId} from the client any more, every one of them
 * derives it from the authenticated JWT's subject claim ({@link com.drinksaver.security.AuthenticatedUser}),
 * so the tests authenticate with a JWT whose subject is the id the stubbing/assertions expect,
 * and {@code saveDrinkIgnoresClientSuppliedUserIdAndUsesJwtSubject} /
 * {@code deleteSavedDrinkOnlyDeletesIdsOwnedByTheAuthenticatedUser} exist specifically to prove a
 * client can no longer act on another user's data by lying in the request.
 */
@WebMvcTest(DrinksController.class)
@ImportAutoConfiguration({
    SecurityAutoConfiguration.class,
    ServletWebSecurityAutoConfiguration.class,
    SecurityFilterAutoConfiguration.class
})
@Import({SecurityConfig.class, DrinksControllerTest.TestConfig.class})
class DrinksControllerTest {

    private static final int BEER_ID = 4;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DrinksRepository drinksRepository;

    @MockitoBean
    private RecommendationCacheService recommendationCacheService;

    @MockitoBean
    private AlcoholNameCollector alcoholNameCollector;

    @MockitoBean
    private BeerNameCollector beerNameCollector;

    @TestConfiguration
    static class TestConfig {
        @Bean
        InjectorService injectorService(DrinksRepository drinksRepository) {
            when(drinksRepository.is(any())).thenReturn(true);
            return new InjectorService(
                Map.of("alcohol", mock(AlcoholRepository.class)),
                Map.of("beer", mock(BeerRepository.class)),
                Map.of("drinks", drinksRepository),
                repositoryConfiguration()
            );
        }

        @Bean
        RepositoryConfiguration repositoryConfiguration() {
            return new RepositoryConfiguration("mock", "mock", "mock", "mock", List.of(), BEER_ID, 10, 0.97);
        }
    }

    private SavedDrink savedDrink(int id, UUID userId, Integer alcoholTypeId) {
        SavedDrink drink = new SavedDrink(
            userId, "2026-01-01", alcoholTypeId, null, 2, null, null, null, null
        );
        drink.setId(id);
        return drink;
    }

    @Test
    void getSavedDrinksUsesBeerCollectorWhenAlcoholTypeIsBeer() throws Exception {
        UUID userId = UUID.randomUUID();
        SavedDrink beerDrink = savedDrink(1, userId, BEER_ID);

        when(drinksRepository.getSavedDrinks(userId, "2026-01-01")).thenReturn(List.of(beerDrink));
        when(beerNameCollector.collectBeerName(any(DrinkKey.class)))
            .thenReturn(DrinkKey.of(beerDrink).withName("Heineken (33cl)"));

        mockMvc.perform(get("/v1/drinks/date/{date}", "2026-01-01")
                .with(jwt().jwt(token -> token.subject(userId.toString()))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(1))
            .andExpect(jsonPath("$[0].name").value("Heineken (33cl)"))
            .andExpect(jsonPath("$[0].alcoholTypeId").value(BEER_ID));

        verify(beerNameCollector).collectBeerName(any(DrinkKey.class));
        verifyNoInteractions(alcoholNameCollector);
    }

    @Test
    void getSavedDrinksUsesAlcoholCollectorWhenAlcoholTypeIsNotBeer() throws Exception {
        UUID userId = UUID.randomUUID();
        int wineTypeId = BEER_ID + 1;
        SavedDrink wineDrink = savedDrink(2, userId, wineTypeId);

        when(drinksRepository.getSavedDrinks(userId, "2026-01-01")).thenReturn(List.of(wineDrink));
        when(alcoholNameCollector.collectAlcoholName(any(DrinkKey.class)))
            .thenReturn(DrinkKey.of(wineDrink).withName("Merlot (75cl)"));

        mockMvc.perform(get("/v1/drinks/date/{date}", "2026-01-01")
                .with(jwt().jwt(token -> token.subject(userId.toString()))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(2))
            .andExpect(jsonPath("$[0].name").value("Merlot (75cl)"))
            .andExpect(jsonPath("$[0].alcoholTypeId").value(wineTypeId));

        verify(alcoholNameCollector).collectAlcoholName(any(DrinkKey.class));
        verifyNoInteractions(beerNameCollector);
    }

    @Test
    void getSavedDrinksUsesTheAuthenticatedUserIdRegardlessOfWhoElseHasDrinksThatDate() throws Exception {
        UUID authenticatedUserId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();

        when(drinksRepository.getSavedDrinks(authenticatedUserId, "2026-01-01")).thenReturn(List.of());

        mockMvc.perform(get("/v1/drinks/date/{date}", "2026-01-01")
                .with(jwt().jwt(token -> token.subject(authenticatedUserId.toString()))))
            .andExpect(status().isOk());

        verify(drinksRepository).getSavedDrinks(authenticatedUserId, "2026-01-01");
        verifyNoInteractions(alcoholNameCollector, beerNameCollector);
        assertThat(otherUserId).isNotEqualTo(authenticatedUserId);
    }

    @Test
    void getSavedDrinksWithoutTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/v1/drinks/date/{date}", "2026-01-01"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void saveDrinkReturnsOkAndInvalidatesRecommendationCacheAfterSaving() throws Exception {
        UUID userId = UUID.randomUUID();
        String body = """
            {
              "userId": "%s",
              "date": "2026-01-01",
              "alcoholTypeId": 4,
              "alcoholSubtypeId": null,
              "alcoholVolumeId": 2,
              "brandId": 3,
              "beerFlavourId": null,
              "consumptionTypeId": 1,
              "comments": null,
              "quantity": 1,
              "addToRecommendations": false,
              "onlyTemporarily": false,
              "name": null
            }
            """.formatted(userId);

        SavedDrink saved = savedDrink(9, userId, BEER_ID);
        when(drinksRepository.saveDrink(any())).thenReturn(saved);

        mockMvc.perform(post("/v1/drinks/new")
                .with(jwt().jwt(token -> token.subject(userId.toString())))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(9))
            .andExpect(jsonPath("$.userId").value(userId.toString()))
            .andExpect(jsonPath("$.alcoholTypeId").value(BEER_ID));

        org.mockito.InOrder inOrder = org.mockito.Mockito.inOrder(drinksRepository, recommendationCacheService);
        inOrder.verify(drinksRepository, times(1)).saveDrink(any());
        inOrder.verify(recommendationCacheService, times(1)).onDrinkSaved(any());
    }

    @Test
    void saveDrinkIgnoresClientSuppliedUserIdAndUsesJwtSubject() throws Exception {
        UUID authenticatedUserId = UUID.randomUUID();
        UUID spoofedUserId = UUID.randomUUID();
        String body = """
            {
              "userId": "%s",
              "date": "2026-01-01",
              "alcoholTypeId": 4,
              "alcoholSubtypeId": null,
              "alcoholVolumeId": 2,
              "brandId": 3,
              "beerFlavourId": null,
              "consumptionTypeId": 1,
              "comments": null,
              "quantity": 1,
              "addToRecommendations": false,
              "onlyTemporarily": false,
              "name": null
            }
            """.formatted(spoofedUserId);

        when(drinksRepository.saveDrink(any())).thenReturn(savedDrink(9, authenticatedUserId, BEER_ID));

        mockMvc.perform(post("/v1/drinks/new")
                .with(jwt().jwt(token -> token.subject(authenticatedUserId.toString())))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk());

        org.mockito.ArgumentCaptor<Drink> captor = org.mockito.ArgumentCaptor.forClass(Drink.class);
        verify(drinksRepository).saveDrink(captor.capture());
        assertThat(captor.getValue().userId()).isEqualTo(authenticatedUserId);
    }

    @Test
    void deleteSavedDrinkOnlyDeletesIdsOwnedByTheAuthenticatedUser() throws Exception {
        UUID authenticatedUserId = UUID.randomUUID();

        when(drinksRepository.ownedDrinkIds(List.of(1, 2), authenticatedUserId)).thenReturn(List.of(1));
        when(drinksRepository.deleteSavedDrink(List.of(1))).thenReturn(1);

        mockMvc.perform(delete("/v1/drinks/byIds")
                .with(jwt().jwt(token -> token.subject(authenticatedUserId.toString())))
                .param("drinkIds", "1", "2"))
            .andExpect(status().isOk())
            .andExpect(content().string("1"));

        verify(drinksRepository).deleteSavedDrink(List.of(1));
    }
}

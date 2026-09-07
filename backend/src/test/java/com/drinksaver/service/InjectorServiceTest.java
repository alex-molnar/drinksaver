package com.drinksaver.service;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.repository.AlcoholRepository;
import com.drinksaver.repository.BeerRepository;
import com.drinksaver.repository.DrinksRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class InjectorServiceTest {

    private static final UUID ADMIN = UUID.randomUUID();

    @Test
    void getAlcoholRepositoryReturnsPostgresImpl() {
        AlcoholRepository alcohol = mock(AlcoholRepository.class);
        when(alcohol.is("postgres")).thenReturn(true);

        RepositoryConfiguration config = new RepositoryConfiguration(
                "postgres", "postgres", "postgres", "postgres",
                List.of(ADMIN), 4, 10, 0.97
        );

        InjectorService service = new InjectorService(
                Map.of("alcohol", alcohol),
                Map.of("beer", mock(BeerRepository.class)),
                Map.of("drinks", mock(DrinksRepository.class)),
                config
        );

        AlcoholRepository result = service.getAlcoholRepository();

        assertThat(result).isNotNull().isEqualTo(alcohol);
    }

    @Test
    void getBeerRepositoryReturnsPostgresImpl() {
        BeerRepository beer = mock(BeerRepository.class);
        when(beer.is("postgres")).thenReturn(true);

        RepositoryConfiguration config = new RepositoryConfiguration(
                "postgres", "postgres", "postgres", "postgres",
                List.of(ADMIN), 4, 10, 0.97
        );

        InjectorService service = new InjectorService(
                Map.of("alcohol", mock(AlcoholRepository.class)),
                Map.of("beer", beer),
                Map.of("drinks", mock(DrinksRepository.class)),
                config
        );

        BeerRepository result = service.getBeerRepository();

        assertThat(result).isNotNull().isEqualTo(beer);
    }

    @Test
    void getDrinksRepositoryReturnsPostgresImpl() {
        DrinksRepository drinks = mock(DrinksRepository.class);
        when(drinks.is("postgres")).thenReturn(true);

        RepositoryConfiguration config = new RepositoryConfiguration(
                "postgres", "postgres", "postgres", "postgres",
                List.of(ADMIN), 4, 10, 0.97
        );

        InjectorService service = new InjectorService(
                Map.of("alcohol", mock(AlcoholRepository.class)),
                Map.of("beer", mock(BeerRepository.class)),
                Map.of("drinks", drinks),
                config
        );

        DrinksRepository result = service.getDrinksRepository();

        assertThat(result).isNotNull().isEqualTo(drinks);
    }

    @Test
    void getAlcoholRepositoryThrowsWhenNoMatchingImplementation() {
        AlcoholRepository alcohol = mock(AlcoholRepository.class);
        when(alcohol.is("mysql")).thenReturn(false);

        RepositoryConfiguration config = new RepositoryConfiguration(
                "mysql", "mysql", "mysql", "mysql",
                List.of(ADMIN), 4, 10, 0.97
        );

        InjectorService service = new InjectorService(
                Map.of("alcohol", alcohol),
                Map.of("beer", mock(BeerRepository.class)),
                Map.of("drinks", mock(DrinksRepository.class)),
                config
        );

        assertThatThrownBy(service::getAlcoholRepository)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("No such AlcoholRepository");
    }

    @Test
    void getBeerRepositoryThrowsWhenNoMatchingImplementation() {
        BeerRepository beer = mock(BeerRepository.class);
        when(beer.is("mysql")).thenReturn(false);

        RepositoryConfiguration config = new RepositoryConfiguration(
                "postgres", "mysql", "postgres", "postgres",
                List.of(ADMIN), 4, 10, 0.97
        );

        InjectorService service = new InjectorService(
                Map.of("alcohol", mock(AlcoholRepository.class)),
                Map.of("beer", beer),
                Map.of("drinks", mock(DrinksRepository.class)),
                config
        );

        assertThatThrownBy(service::getBeerRepository)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("No such BeerRepository");
    }

    @Test
    void getDrinksRepositoryThrowsWhenNoMatchingImplementation() {
        DrinksRepository drinks = mock(DrinksRepository.class);
        when(drinks.is("mysql")).thenReturn(false);

        RepositoryConfiguration config = new RepositoryConfiguration(
                "postgres", "postgres", "mysql", "postgres",
                List.of(ADMIN), 4, 10, 0.97
        );

        InjectorService service = new InjectorService(
                Map.of("alcohol", mock(AlcoholRepository.class)),
                Map.of("beer", mock(BeerRepository.class)),
                Map.of("drinks", drinks),
                config
        );

        assertThatThrownBy(service::getDrinksRepository)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("No such DrinksRepository");
    }
}

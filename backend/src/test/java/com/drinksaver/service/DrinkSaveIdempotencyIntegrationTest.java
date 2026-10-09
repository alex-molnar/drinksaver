package com.drinksaver.service;

import com.drinksaver.model.db.SavedDrink;
import com.drinksaver.model.dto.post.Drink;
import com.drinksaver.repository.schema.SavedDrinksTable;
import com.drinksaver.service.namecollector.DrinkNameCollector;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Import({DrinksService.class, DrinkSaveIdempotencyIntegrationTest.JsonConfig.class})
@DataJpaTest
@Testcontainers(disabledWithoutDocker = true)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class DrinkSaveIdempotencyIntegrationTest {

    @TestConfiguration
    static class JsonConfig {
        @Bean
        @Primary
        ObjectMapper testObjectMapper() {
            return new ObjectMapper();
        }
    }

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    @Autowired
    private DrinksService drinksService;

    @Autowired
    private SavedDrinksTable savedDrinksTable;

    @MockitoBean
    private DrinkNameCollector drinkNameCollector;

    @Test
    void repeatedKeyReturnsTheSameRowsWithoutInsertingTwice() {
        UUID userId = UUID.randomUUID();
        UUID requestKey = UUID.randomUUID();
        long before = savedDrinksTable.count();
        Drink request = new Drink(
            userId, "2026-10-09", 1, null, 2, null, null, null, 3, 4,
            null, 2, false, null, null
        );

        IdempotentDrinkSave first = drinksService.saveDrink(request, requestKey);
        IdempotentDrinkSave retry = drinksService.saveDrink(request, requestKey);

        assertThat(first.created()).isTrue();
        assertThat(retry.created()).isFalse();
        assertThat(retry.drinks()).usingRecursiveComparison().isEqualTo(first.drinks());
        assertThat(savedDrinksTable.count()).isEqualTo(before + 2);
        assertThat(first.drinks()).extracting(SavedDrink::getId).doesNotContainNull();
    }
}

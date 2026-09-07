package com.drinksaver.repository.postgres;

import com.drinksaver.model.db.Recommendation;
import com.drinksaver.model.db.SavedDrink;
import com.drinksaver.model.dto.Drink;
import com.drinksaver.repository.postgres.schema.RecommendationsTable;
import com.drinksaver.repository.postgres.schema.SavedDrinksTable;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PostgresDrinksRepositoryTest {

    private static final UUID USER = UUID.randomUUID();

    @Test
    void isReturnsTrueForPostgres() {
        PostgresDrinksRepository repo = new PostgresDrinksRepository(
                mock(SavedDrinksTable.class),
                mock(RecommendationsTable.class)
        );

        assertThat(repo.is("postgres")).isTrue();
        assertThat(repo.is("mysql")).isFalse();
    }

    @Test
    void saveDrinkWithNullQuantitySavesSingle() {
        SavedDrinksTable savedTable = mock(SavedDrinksTable.class);
        SavedDrink saved = new SavedDrink(USER, "2026-09-08", 1, 2, 3, null, null, null, null);
        when(savedTable.save(any())).thenReturn(saved);

        Drink drink = new Drink(USER, "2026-09-08", 1, 2, 3, null, null, null, null, null, null, null, null);

        PostgresDrinksRepository repo = new PostgresDrinksRepository(
                savedTable,
                mock(RecommendationsTable.class)
        );

        SavedDrink result = repo.saveDrink(drink);

        assertThat(result).isEqualTo(saved);
        verify(savedTable, times(1)).save(any());
    }

    @Test
    void saveDrinkWithQuantityMultiplier() {
        SavedDrinksTable savedTable = mock(SavedDrinksTable.class);
        SavedDrink saved = new SavedDrink(USER, "2026-09-08", 1, 2, 3, null, null, null, null);
        when(savedTable.saveAll(any())).thenReturn(List.of(saved, saved, saved));

        Drink drink = new Drink(USER, "2026-09-08", 1, 2, 3, null, null, null, null, 3, null, null, null);

        PostgresDrinksRepository repo = new PostgresDrinksRepository(
                savedTable,
                mock(RecommendationsTable.class)
        );

        SavedDrink result = repo.saveDrink(drink);

        assertThat(result).isEqualTo(saved);
        ArgumentCaptor<List> captor = ArgumentCaptor.forClass(List.class);
        verify(savedTable).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(3);
    }

    @Test
    void saveDrinkSavesRecommendationWhenShouldAdd() {
        SavedDrinksTable savedTable = mock(SavedDrinksTable.class);
        SavedDrink saved = new SavedDrink(USER, "2026-09-08", 1, 2, 3, null, null, null, null);
        when(savedTable.save(any())).thenReturn(saved);

        RecommendationsTable recTable = mock(RecommendationsTable.class);

        Drink drink = new Drink(USER, "2026-09-08", 1, 2, 3, null, null, null, null, null, true, null, null);

        PostgresDrinksRepository repo = new PostgresDrinksRepository(savedTable, recTable);
        repo.saveDrink(drink);

        verify(recTable).save(any(Recommendation.class));
    }

    @Test
    void saveDrinkDoesNotSaveRecommendationWhenShouldNotAdd() {
        SavedDrinksTable savedTable = mock(SavedDrinksTable.class);
        SavedDrink saved = new SavedDrink(USER, "2026-09-08", 1, 2, 3, null, null, null, null);
        when(savedTable.save(any())).thenReturn(saved);

        RecommendationsTable recTable = mock(RecommendationsTable.class);

        Drink drink = new Drink(USER, "2026-09-08", 1, 2, 3, null, null, null, null, null, false, null, null);

        PostgresDrinksRepository repo = new PostgresDrinksRepository(savedTable, recTable);
        repo.saveDrink(drink);

        verify(recTable, never()).save(any());
    }

    @Test
    void getSavedDrinksQueriesTable() {
        SavedDrink drink = new SavedDrink(USER, "2026-09-08", 1, 2, 3, null, null, null, null);
        SavedDrinksTable savedTable = mock(SavedDrinksTable.class);
        when(savedTable.findByUserIdAndDate(USER, "2026-09-08")).thenReturn(List.of(drink));

        PostgresDrinksRepository repo = new PostgresDrinksRepository(
                savedTable,
                mock(RecommendationsTable.class)
        );

        List<SavedDrink> result = repo.getSavedDrinks(USER, "2026-09-08");

        assertThat(result).contains(drink);
    }

    @Test
    void deleteSavedDrinkDelegatesAndReturnsCount() {
        SavedDrinksTable savedTable = mock(SavedDrinksTable.class);
        when(savedTable.deleteAndCountByIds(List.of(1, 2, 3))).thenReturn(3);

        PostgresDrinksRepository repo = new PostgresDrinksRepository(
                savedTable,
                mock(RecommendationsTable.class)
        );

        int result = repo.deleteSavedDrink(List.of(1, 2, 3));

        assertThat(result).isEqualTo(3);
    }
}

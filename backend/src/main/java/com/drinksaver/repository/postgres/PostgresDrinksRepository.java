package com.drinksaver.repository.postgres;

import com.drinksaver.model.db.Recommendation;
import com.drinksaver.model.db.SavedDrink;
import com.drinksaver.model.dto.Drink;
import com.drinksaver.repository.DrinksRepository;
import com.drinksaver.repository.postgres.schema.RecommendationsTable;
import com.drinksaver.repository.postgres.schema.SavedDrinksTable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

@Repository
public class PostgresDrinksRepository implements DrinksRepository {
    private final SavedDrinksTable savedDrinksTable;
    private final RecommendationsTable recommendationsTable;

    @Autowired
    PostgresDrinksRepository(SavedDrinksTable savedDrinksTable, RecommendationsTable recommendationsTable) {
        this.savedDrinksTable = savedDrinksTable;
        this.recommendationsTable = recommendationsTable;
    }

    @Override
    public boolean is(String repositoryType) {
        return repositoryType.equals("postgres");
    }

    @Override
    public SavedDrink saveDrink(Drink drink) {
        if (drink.shouldAddToRecommendations()) {
            recommendationsTable.save(Recommendation.of(drink));
        }

        return drink.quantity() == null
            ? savedDrinksTable.save(SavedDrink.of(drink))
            : savedDrinksTable.saveAll(
                IntStream.range(0, drink.quantity()).mapToObj(i -> SavedDrink.of(drink)).toList()
            ).getFirst();
    }

    @Override
    public List<SavedDrink> getSavedDrinks(UUID userId, String date) {
        return savedDrinksTable.findByUserIdAndDate(userId, date);
    }

    @Override
    public int deleteSavedDrink(List<Integer> drinkIds) {
        return savedDrinksTable.deleteAndCountByIds(drinkIds);
    }
}

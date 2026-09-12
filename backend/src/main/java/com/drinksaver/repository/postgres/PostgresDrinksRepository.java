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
import java.util.Objects;
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

    /**
     * Returns every row written, not just the first. A caller that saved N drinks needs all N
     * ids to be able to undo the save; returning getFirst() left N-1 rows unreachable.
     */
    @Override
    public List<SavedDrink> saveDrink(Drink drink) {
        if (drink.shouldAddToRecommendations()) {
            recommendationsTable.save(Recommendation.of(drink));  // TODO: This right now falls to default color palette and glassware, set this properly
        }

        return drink.quantity() == null
            ? List.of(savedDrinksTable.save(SavedDrink.of(drink)))
            : savedDrinksTable.saveAll(
                IntStream.range(0, drink.quantity()).mapToObj(i -> SavedDrink.of(drink)).toList()
            );
    }

    @Override
    public List<SavedDrink> getSavedDrinks(UUID userId, String date) {
        return savedDrinksTable.findByUserIdAndDate(userId, date);
    }

    @Override
    public List<Integer> ownedDrinkIds(List<Integer> drinkIds, UUID userId) {
        return savedDrinksTable.findAllById(drinkIds).stream()
            // Objects.equals, not .equals: user_id is nullable, so one null row whose id
            // appears in the request would 500 the whole delete. Same defect as the one in
            // DrinksController, which was fixed without checking for siblings.
            .filter(drink -> Objects.equals(drink.getUserId(), userId))
            .map(SavedDrink::getId)
            .toList();
    }

    @Override
    public int deleteSavedDrink(List<Integer> drinkIds) {
        return savedDrinksTable.deleteAndCountByIds(drinkIds);
    }
}

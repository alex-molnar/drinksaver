package com.drinksaver.repository;

import com.drinksaver.model.db.SavedDrink;
import com.drinksaver.model.dto.Drink;

import java.util.List;
import java.util.UUID;

public interface DrinksRepository {
    boolean is(String repositoryType);
    SavedDrink saveDrink(Drink drink);
    List<SavedDrink> getSavedDrinks(UUID userId, String date);
    List<Integer> ownedDrinkIds(List<Integer> drinkIds, UUID userId);
    int deleteSavedDrink(List<Integer> drinkIds);
}


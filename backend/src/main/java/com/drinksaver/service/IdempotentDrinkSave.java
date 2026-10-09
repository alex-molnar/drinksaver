package com.drinksaver.service;

import com.drinksaver.model.db.SavedDrink;

import java.util.List;

public record IdempotentDrinkSave(List<SavedDrink> drinks, boolean created) {}

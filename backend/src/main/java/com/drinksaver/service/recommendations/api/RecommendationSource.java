package com.drinksaver.service.recommendations.api;


import com.drinksaver.service.model.DrinkKey;

import java.util.Map;
import java.util.UUID;

public interface RecommendationSource {
    Map<DrinkKey, Double> buildRecommendation(UUID userId);
}

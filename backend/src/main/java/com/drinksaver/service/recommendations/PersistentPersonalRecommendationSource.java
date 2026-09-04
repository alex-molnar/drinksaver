package com.drinksaver.service.recommendations;

import com.drinksaver.repository.postgres.schema.RecommendationsTable;
import com.drinksaver.service.model.DrinkKey;
import com.drinksaver.service.recommendations.api.RecommendationSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PersistentPersonalRecommendationSource implements RecommendationSource {

    private final RecommendationsTable RecommendationsTable;

    public PersistentPersonalRecommendationSource(RecommendationsTable RecommendationsTable) {
        this.RecommendationsTable = RecommendationsTable;
    }

    @Override
    public Map<DrinkKey, Double> buildRecommendation(UUID userId) {
        return RecommendationsTable.findValidByUserId(
            userId,
            LocalDateTime.now()
        ).stream().collect(Collectors.toMap(
            DrinkKey::of,
            notUsed -> Double.MAX_VALUE,
            (k1, k2) -> k1
        ));
    }
}

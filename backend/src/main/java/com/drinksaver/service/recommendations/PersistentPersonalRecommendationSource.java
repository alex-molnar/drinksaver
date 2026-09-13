package com.drinksaver.service.recommendations;

import com.drinksaver.model.db.Recommendation;
import com.drinksaver.repository.postgres.schema.RecommendationsTable;
import com.drinksaver.service.model.DrinkKey;
import com.drinksaver.service.recommendations.api.RecommendationSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
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
        List<Recommendation> rec = RecommendationsTable.findValidByUserId(
            userId,
            LocalDateTime.now()
        );
        System.out.printf("Got number of recs: %d%n", rec.size());
        rec.forEach(r -> System.out.printf("Rec: %s%n", r.getName()));
        Map<DrinkKey, Double> ret = rec.stream().collect(Collectors.toMap(
            DrinkKey::of,
            notUsed -> Double.MAX_VALUE,
            (k1, k2) -> k1
        ));
        ret.entrySet().forEach((e -> System.out.printf("K: %s, V: %f%n", e.getKey().name(), e.getValue())));
        return ret; // TODO obviously
    }
}

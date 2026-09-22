package com.drinksaver.service.recommendations;

import com.drinksaver.model.db.Recommendation;
import com.drinksaver.repository.schema.RecommendationsTable;
import com.drinksaver.service.recommendations.api.RecommendationSource;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.stream.Stream;

@Service
public class PersistentPersonalRecommendationSource implements RecommendationSource {

    private final RecommendationsTable RecommendationsTable;

    public PersistentPersonalRecommendationSource(RecommendationsTable RecommendationsTable) {
        this.RecommendationsTable = RecommendationsTable;
    }

    @Override
    public Stream<Recommendation> buildRecommendation(UUID userId, Stream<Recommendation> processed) {
        return Stream.concat(processed, RecommendationsTable.findValidByUserId(userId, LocalDateTime.now()).stream()).distinct();
    }

    @Override
    public Integer orderId() {
        return 0;
    }
}

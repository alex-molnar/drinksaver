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
import java.util.stream.Stream;

@Service
public class PersistentPersonalRecommendationSource implements RecommendationSource {

    private final RecommendationsTable RecommendationsTable;

    public PersistentPersonalRecommendationSource(RecommendationsTable RecommendationsTable) {
        this.RecommendationsTable = RecommendationsTable;
    }

    @Override
    public Stream<Recommendation> buildRecommendation(UUID userId, Stream<Recommendation> processed) {
        System.out.println("\nPersistent\n");
        return Stream.concat(processed, RecommendationsTable.findValidByUserId(userId, LocalDateTime.now()).stream()).distinct()
                .peek(e -> System.out.printf("%s: %s%n", e.getName(), e)); // TODO peek
    }

    @Override
    public Integer orderId() {
        return 0;
    }
}

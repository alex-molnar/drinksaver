package com.drinksaver.service.recommendations;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.Recommendation;
import com.drinksaver.model.db.admin.DefaultRecommendation;
import com.drinksaver.repository.schema.admin.DefaultRecommendationsTable;
import com.drinksaver.service.recommendations.api.RecommendationSource;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

@Service
public class DefaultRecommendationSource implements RecommendationSource {

    private final DefaultRecommendationsTable defaultRecommendationsTable;

    public DefaultRecommendationSource(DefaultRecommendationsTable defaultRecommendationsTable) {
        this.defaultRecommendationsTable = defaultRecommendationsTable;
    }

    @Override
    public Stream<Recommendation> buildRecommendation(UUID userId, Stream<Recommendation> processed) {
        return Stream.concat(processed, defaultRecommendationsTable.findAllByOrderByOrderNumberAsc().stream().map(DefaultRecommendation::toRecommendation)).distinct();
    }

    @Override
    public Integer orderId() {
        return 2;
    }
}

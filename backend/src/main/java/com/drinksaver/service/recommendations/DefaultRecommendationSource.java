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
    private final RepositoryConfiguration repositoryConfiguration;

    public DefaultRecommendationSource(DefaultRecommendationsTable defaultRecommendationsTable, RepositoryConfiguration repositoryConfiguration) {
        this.defaultRecommendationsTable = defaultRecommendationsTable;
        this.repositoryConfiguration = repositoryConfiguration;
    }

    @Override
    public Stream<Recommendation> buildRecommendation(UUID userId, Stream<Recommendation> processed) { // TODO get admin recommendation from default table
        List<UUID> adminUserIds = repositoryConfiguration.adminUserList();
        if (adminUserIds == null || adminUserIds.isEmpty()) {
            return Stream.empty();
        }

        return Stream.concat(processed, defaultRecommendationsTable.findAllByOrderByOrderNumberAsc().stream().map(DefaultRecommendation::toRecommendation)).distinct();
    }

    @Override
    public Integer orderId() {
        return 2;
    }
}

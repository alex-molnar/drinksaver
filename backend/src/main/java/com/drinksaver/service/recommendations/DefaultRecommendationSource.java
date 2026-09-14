package com.drinksaver.service.recommendations;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.Recommendation;
import com.drinksaver.repository.postgres.schema.RecommendationsTable;
import com.drinksaver.service.recommendations.api.RecommendationSource;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

@Service
public class DefaultRecommendationSource implements RecommendationSource {

    private final RecommendationsTable recommendationsTable;
    private final RepositoryConfiguration repositoryConfiguration;

    public DefaultRecommendationSource(RecommendationsTable recommendationsTable, RepositoryConfiguration repositoryConfiguration) {
        this.recommendationsTable = recommendationsTable;
        this.repositoryConfiguration = repositoryConfiguration;
    }

    @Override
    public Stream<Recommendation> buildRecommendation(UUID userId, Stream<Recommendation> processed) {
        List<UUID> adminUserIds = repositoryConfiguration.adminUserList();
        if (adminUserIds == null || adminUserIds.isEmpty()) {
            return Stream.empty();
        }

        System.out.println("\nDefault\n");

        return Stream.concat(processed, recommendationsTable.findByUserIdIn(adminUserIds).stream()).distinct().peek(e -> System.out.printf("%s: %s%n", e.getName(), e)); // TODO: peek
    }

    @Override
    public Integer orderId() {
        return 2;
    }
}

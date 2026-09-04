package com.drinksaver.service.recommendations;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.repository.postgres.schema.RecommendationsTable;
import com.drinksaver.service.model.DrinkKey;
import com.drinksaver.service.recommendations.api.RecommendationSource;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class DefaultRecommendationSource implements RecommendationSource {

    private final RecommendationsTable recommendationsTable;
    private final RepositoryConfiguration repositoryConfiguration;

    public DefaultRecommendationSource(RecommendationsTable recommendationsTable, RepositoryConfiguration repositoryConfiguration) {
        this.recommendationsTable = recommendationsTable;
        this.repositoryConfiguration = repositoryConfiguration;
    }

    @Override
    public Map<DrinkKey, Double> buildRecommendation(UUID userId) {
        List<UUID> adminUserIds = repositoryConfiguration.adminUserList();
        if (adminUserIds == null || adminUserIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return recommendationsTable
            .findByUserIdIn(adminUserIds)
            .stream()
            .map(DrinkKey::of)
            .collect(Collectors.toMap(
                Function.identity(),
                _notUsed -> 0.0,
                (v1, v2) -> v1
            ));
    }
}

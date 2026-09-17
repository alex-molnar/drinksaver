package com.drinksaver.service;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.Recommendation;
import com.drinksaver.model.dto.RecommendationUpdate;
import com.drinksaver.repository.postgres.schema.RecommendationsTable;
import com.drinksaver.service.recommendations.api.RecommendationSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class RecommendationService {

    private final RepositoryConfiguration repositoryConfiguration;
    private final List<RecommendationSource> recommendationSources;
    private final RecommendationsTable recommendationsTable;

    @Autowired
    public RecommendationService(
        RepositoryConfiguration repositoryConfiguration,
        Map<String, RecommendationSource> recommendationSources,
        RecommendationsTable recommendationsTable
    ) {
        this.repositoryConfiguration = repositoryConfiguration;
        this.recommendationSources = recommendationSources.values().stream().sorted().toList();
        this.recommendationsTable = recommendationsTable;
    }

    @Cacheable(value = "recommendations", key = "#userId")
    public List<Recommendation> getRecommendations(UUID userId) {
        List<Recommendation> collected = Collections.emptyList();
        for (RecommendationSource source : recommendationSources) {
            if (collected.size() >= repositoryConfiguration.maxPersonalRecommendations()) {
                break;
            }
            collected = source.buildRecommendation(userId, collected.stream())
                .limit(repositoryConfiguration.maxPersonalRecommendations())
                .toList();
        }
        return collected;
    }

    public int updateRecommendationsOrder(UUID userId, List<RecommendationUpdate> updates) {
        if (updates.isEmpty()) return 0;

        return recommendationsTable.updateRecommendationsOrderArray(
                updates.stream().map(RecommendationUpdate::id).toArray(Integer[]::new),
                updates.stream().map(RecommendationUpdate::name).toArray(String[]::new)
        );
    }

    public boolean isRecommendationOwnedByUser(Integer id, UUID userId) {
        return recommendationsTable.findById(id).filter(recommendation -> recommendation.getUserId().equals(userId)).isPresent();
    }

    public void deleteRecommendation(Integer id) {
        recommendationsTable.deleteById(id);
    }
}

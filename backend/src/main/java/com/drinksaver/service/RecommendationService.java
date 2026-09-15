package com.drinksaver.service;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.Recommendation;
import com.drinksaver.service.recommendations.api.RecommendationSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class RecommendationService {

    private final RepositoryConfiguration repositoryConfiguration;
    private final List<RecommendationSource> recommendationSources;

    @Autowired
    public RecommendationService(
        RepositoryConfiguration repositoryConfiguration,
        Map<String, RecommendationSource> recommendationSources
    ) {
        this.repositoryConfiguration = repositoryConfiguration;
        this.recommendationSources = recommendationSources.values().stream().sorted().toList();
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
}

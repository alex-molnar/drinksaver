package com.drinksaver.service;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.Recommendation;
import com.drinksaver.service.model.DrinkKey;
import com.drinksaver.service.namecollector.AlcoholNameCollector;
import com.drinksaver.service.namecollector.BeerNameCollector;
import com.drinksaver.service.recommendations.api.RecommendationSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class RecommendationService {

    private final RepositoryConfiguration repositoryConfiguration;
    private final Iterator<RecommendationSource> recommendationSources;
    private final BeerNameCollector beerNameCollector;
    private final AlcoholNameCollector alcoholNameCollector;

    @Autowired
    public RecommendationService(
        RepositoryConfiguration repositoryConfiguration,
        Map<String, RecommendationSource> recommendationSources,
        BeerNameCollector beerNameCollector,
        AlcoholNameCollector alcoholNameCollector
    ) {
        this.repositoryConfiguration = repositoryConfiguration;
        this.recommendationSources = recommendationSources.values().stream().sorted().iterator();
        this.beerNameCollector = beerNameCollector;
        this.alcoholNameCollector = alcoholNameCollector;
    }

    @Cacheable(value = "recommendations", key = "#userId")
    public List<Recommendation> getRecommendations(UUID userId) {
        List<Recommendation> collected = Collections.emptyList();
        while (collected.size() < repositoryConfiguration.maxPersonalRecommendations() && recommendationSources.hasNext()) {
            RecommendationSource source = recommendationSources.next();
            collected = source.buildRecommendation(userId, collected.stream())
                .limit(repositoryConfiguration.maxPersonalRecommendations())
                .toList();
        }
        return collected;
    }

    private DrinkKey withName(DrinkKey key) {
        if (key.name().isPresent()) {
            return key;
        }

        try {
            return Objects.equals(key.alcoholTypeId(), repositoryConfiguration.beerId())
                    ? beerNameCollector.collectBeerName(key)
                    : alcoholNameCollector.collectAlcoholName(key);
        } catch (Exception e) {
            return key;
        }
    }
}


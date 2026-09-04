package com.drinksaver.service;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.Recommendation;
import com.drinksaver.repository.postgres.schema.*;
import com.drinksaver.service.model.DrinkKey;
import com.drinksaver.service.namecollector.AlcoholNameCollector;
import com.drinksaver.service.namecollector.BeerNameCollector;
import com.drinksaver.service.recommendations.api.RecommendationSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RecommendationService {

    private final RepositoryConfiguration repositoryConfiguration;
    private final Map<String, RecommendationSource> recommendationSources;
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
        this.recommendationSources = recommendationSources;
        this.beerNameCollector = beerNameCollector;
        this.alcoholNameCollector = alcoholNameCollector;
    }

    @Cacheable(value = "recommendations", key = "#userId")
    public List<Recommendation> getRecommendations(UUID userId) {
        return recommendationSources
            .values()
            .stream()
            .flatMap(source -> source.buildRecommendation(userId).entrySet().stream())
            .collect(Collectors.toMap(
                Map.Entry::getKey,
                Map.Entry::getValue,
                Math::max
            ))
            .entrySet().stream()
            .map(entry -> new AbstractMap.SimpleEntry<>(withName(entry.getKey()), entry.getValue()))
            .filter(entry -> entry.getKey().name().isPresent())
            .sorted(Map.Entry.<DrinkKey, Double>comparingByValue().reversed())
            .limit(repositoryConfiguration.maxPersonalRecommendations())
            .map(entry -> entry.getKey().toRecommendation(userId))
            .toList();
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


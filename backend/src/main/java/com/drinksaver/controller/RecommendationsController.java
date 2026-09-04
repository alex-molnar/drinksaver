package com.drinksaver.controller;

import com.drinksaver.model.db.Recommendation;
import com.drinksaver.service.RecommendationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/recommendations")
public class RecommendationsController {

    private final RecommendationService recommendationService;

    @Autowired
    public RecommendationsController(RecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    @GetMapping("/{userId}/list")
    public List<Recommendation> getRecommendationsList(@PathVariable UUID userId) {
        return recommendationService.getRecommendations(userId);
    }
}


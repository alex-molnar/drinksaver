package com.drinksaver.controller;

import com.drinksaver.model.db.Recommendation;
import com.drinksaver.security.AuthenticatedUser;
import com.drinksaver.service.RecommendationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/recommendations")
public class RecommendationsController {

    private final RecommendationService recommendationService;

    @Autowired
    public RecommendationsController(RecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    @GetMapping("/list")
    public List<Recommendation> getRecommendationsList(@AuthenticationPrincipal Jwt jwt) {
        return recommendationService.getRecommendations(AuthenticatedUser.id(jwt));
    }
}


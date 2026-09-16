package com.drinksaver.controller;

import com.drinksaver.model.db.Recommendation;
import com.drinksaver.model.dto.RecommendationUpdate;
import com.drinksaver.security.AuthenticatedUser;
import com.drinksaver.service.RecommendationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

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

    @PatchMapping("/edit")
    public int reorderRecommendations(@AuthenticationPrincipal Jwt jwt, @RequestBody List<RecommendationUpdate> recommendationUpdates) {
        UUID userID = AuthenticatedUser.id(jwt);
        List<Integer> userOwnedRecommendations = recommendationService.getRecommendations(userID)
                .stream()
                .filter(recommendation ->
                    recommendation.getUserId() != null &&
                    recommendation.getUserId().equals(userID) &&
                    recommendation.getId() != null
                )
                .map(Recommendation::getId)
                .toList();

        return recommendationService.updateRecommendationsOrder(
            userID,
            recommendationUpdates
                .stream()
                .filter(recommendationUpdate -> userOwnedRecommendations.contains(recommendationUpdate.id()))
                .toList()
        );
    }

    @DeleteMapping("/{id}")
    public void deleteRecommendation(@AuthenticationPrincipal Jwt jwt, @PathVariable Integer id) {
        if (recommendationService.isRecommendationOwnedByUser(id, AuthenticatedUser.id(jwt))) {
            recommendationService.deleteRecommendation(id);
        } else {
            throw new IllegalArgumentException("That recommendation is not owned by the authenticated user");
        }
    }
}


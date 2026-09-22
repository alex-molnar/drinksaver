package com.drinksaver.controller.user;

import com.drinksaver.model.db.Recommendation;
import com.drinksaver.model.dto.RecommendationUpdate;
import com.drinksaver.security.AuthenticatedUser;
import com.drinksaver.service.RecommendationCacheService;
import com.drinksaver.service.RecommendationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/recommendations")
public class RecommendationsController {

    private final RecommendationService recommendationService;
    private final RecommendationCacheService recommendationCacheService;

    @Autowired
    public RecommendationsController(RecommendationService recommendationService, RecommendationCacheService recommendationCacheService) {
        this.recommendationService = recommendationService;
        this.recommendationCacheService = recommendationCacheService;
    }

    @GetMapping("/list")
    public List<Recommendation> getRecommendationsList(@AuthenticationPrincipal Jwt jwt) {
        return recommendationService.getRecommendations(AuthenticatedUser.id(jwt));
    }

    @PatchMapping("/edit")
    public List<Recommendation> reorderRecommendations(@AuthenticationPrincipal Jwt jwt, @RequestBody List<RecommendationUpdate> recommendationUpdates) {
        UUID userId = AuthenticatedUser.id(jwt);
        List<Integer> userOwnedRecommendations = recommendationService.getRecommendations(userId)
                .stream()
                .filter(recommendation ->
                    recommendation.getUserId() != null &&
                    recommendation.getUserId().equals(userId) &&
                    recommendation.getId() != null
                )
                .map(Recommendation::getId)
                .toList();

        recommendationCacheService.invalidateRecommendations(userId);
        return recommendationService.updateRecommendationsOrder(
            userId,
            recommendationUpdates
                .stream()
                .filter(recommendationUpdate -> userOwnedRecommendations.contains(recommendationUpdate.id()))
                .toList()
        );
    }

    @DeleteMapping("/{id}")
    public void deleteRecommendation(@AuthenticationPrincipal Jwt jwt, @PathVariable Integer id) {
        UUID userId = AuthenticatedUser.id(jwt);
        if (recommendationService.isRecommendationOwnedByUser(id, userId)) {
            recommendationService.deleteRecommendation(id);
            recommendationCacheService.invalidateRecommendations(userId);
        } else {
            throw new IllegalArgumentException("That recommendation is not owned by the authenticated user");
        }
    }
}


package com.drinksaver.controller.admin;

import com.drinksaver.model.db.admin.DefaultRecommendation;
import com.drinksaver.model.dto.post.NewDefaultRecommendation;
import com.drinksaver.model.dto.patch.RecommendationUpdate;
import com.drinksaver.repository.AdminRecommendationsRepository;
import com.drinksaver.service.RecommendationCacheService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/admin/recommendations")
public class AdminRecommendationsController {

    private final AdminRecommendationsRepository adminRecommendationsRepository;
    private final RecommendationCacheService recommendationCacheService;

    @Autowired
    public AdminRecommendationsController(AdminRecommendationsRepository adminRecommendationsRepository, RecommendationCacheService recommendationCacheService) {
        this.adminRecommendationsRepository = adminRecommendationsRepository;
        this.recommendationCacheService = recommendationCacheService;
    }

    @GetMapping("/list")
    public List<DefaultRecommendation> getRecommendationsList() {
        return adminRecommendationsRepository.getRecommendations();
    }

    @PatchMapping("/edit")
    public List<DefaultRecommendation> reorderRecommendations(@Valid @RequestBody List<RecommendationUpdate> recommendationUpdates) {
        recommendationCacheService.invalidateRecommendations();
        return adminRecommendationsRepository.updateRecommendations(recommendationUpdates);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRecommendation(@PathVariable Integer id) {
        recommendationCacheService.invalidateRecommendations();
        return adminRecommendationsRepository.deleteRecommendation(id)
                ? ResponseEntity.ok().build()
                : ResponseEntity.notFound().build();
    }

    @PostMapping
    public DefaultRecommendation createDefaultRecommendation(@Valid @RequestBody NewDefaultRecommendation newDefaultRecommendation) {
        return adminRecommendationsRepository.addRecommendation(newDefaultRecommendation);
    }
}


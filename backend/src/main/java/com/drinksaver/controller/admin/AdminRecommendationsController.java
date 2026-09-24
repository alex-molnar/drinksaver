package com.drinksaver.controller.admin;

import com.drinksaver.model.db.admin.DefaultRecommendation;
import com.drinksaver.model.dto.NewDefaultRecommendation;
import com.drinksaver.model.dto.RecommendationUpdate;
import com.drinksaver.repository.AdminRecommendationsRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/admin/recommendations")
public class AdminRecommendationsController {

    private final AdminRecommendationsRepository adminRecommendationsRepository;

    @Autowired
    public AdminRecommendationsController(AdminRecommendationsRepository adminRecommendationsRepository) {
        this.adminRecommendationsRepository = adminRecommendationsRepository;
    }

    @GetMapping("/list")
    public List<DefaultRecommendation> getRecommendationsList() {
        return adminRecommendationsRepository.getRecommendations();
    }

    @PatchMapping("/edit")
    public List<DefaultRecommendation> reorderRecommendations(@Valid @RequestBody List<RecommendationUpdate> recommendationUpdates) {
        return adminRecommendationsRepository.updateRecommendations(recommendationUpdates);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRecommendation(@PathVariable Integer id) {
        return adminRecommendationsRepository.deleteRecommendation(id)
                ? ResponseEntity.ok().build()
                : ResponseEntity.notFound().build();
    }

    @PostMapping
    public DefaultRecommendation createDefaultRecommendation(@Valid @RequestBody NewDefaultRecommendation newDefaultRecommendation) {
        return adminRecommendationsRepository.addRecommendation(newDefaultRecommendation);
    }
}


package com.drinksaver.repository;

import java.util.List;

import com.drinksaver.model.db.admin.DefaultRecommendation;
import com.drinksaver.model.dto.NewDefaultRecommendation;
import com.drinksaver.model.dto.RecommendationUpdate;
import com.drinksaver.repository.schema.admin.DefaultRecommendationsTable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

@Repository
public class AdminRecommendationsRepository {
    private final DefaultRecommendationsTable defaultRecommendationsTable;

    @Autowired
    public AdminRecommendationsRepository(DefaultRecommendationsTable defaultRecommendationsTable) {
        this.defaultRecommendationsTable = defaultRecommendationsTable;
    }

    public List<DefaultRecommendation> getRecommendations() {
        return defaultRecommendationsTable.findAllByOrderByOrderNumberAsc();
    }

    public List<DefaultRecommendation> updateRecommendations(List<RecommendationUpdate> recommendationUpdates) {  // TODO: allow more edit on recommendations than order and name
        defaultRecommendationsTable.updateDefaultRecommendationsOrderArray(
                recommendationUpdates.stream().map(RecommendationUpdate::id).toArray(Integer[]::new),
                recommendationUpdates.stream().map(RecommendationUpdate::name).toArray(String[]::new)
        );

        return defaultRecommendationsTable.findAllByOrderByOrderNumberAsc();
    }

    public boolean deleteRecommendation(Integer recommendationId) {
        if (!defaultRecommendationsTable.existsById(recommendationId)) {
            return false;
        }
        defaultRecommendationsTable.deleteById(recommendationId);
        return true;
    }

    public DefaultRecommendation addRecommendation(NewDefaultRecommendation defaultRecommendation) {
        return defaultRecommendationsTable.save(DefaultRecommendation.of(
            defaultRecommendation,
            defaultRecommendationsTable.getLargestOrderNumber()
        ));
    }
}

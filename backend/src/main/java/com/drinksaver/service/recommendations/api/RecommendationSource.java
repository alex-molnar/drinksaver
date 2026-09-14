package com.drinksaver.service.recommendations.api;


import com.drinksaver.model.db.Recommendation;

import java.util.UUID;
import java.util.stream.Stream;

public interface RecommendationSource extends Comparable<RecommendationSource> {
    Stream<Recommendation> buildRecommendation(UUID userId, Stream<Recommendation> processed);
    Integer orderId();
    @Override
    default int compareTo(RecommendationSource other) {
        return this.orderId().compareTo(other.orderId());
    }
}

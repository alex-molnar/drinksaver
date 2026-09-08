package com.drinksaver.model.dto;


import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.util.UUID;

public record Drink(
        UUID userId,
        String date,
        Integer alcoholTypeId,
        Integer alcoholSubtypeId,
        Integer alcoholVolumeId,
        Integer brandId,
        Integer beerFlavourId,
        Integer consumptionTypeId,
        String comments,
        /**
         * The number of rows to write, so it has to be at least 1. A 0 or a negative
         * made saveDrink's IntStream range empty, and getFirst() on the empty result
         * threw NoSuchElementException: a 500 for a plainly bad request.
         *
         * The upper bound caps how many rows one request can multiply into. 100 is an
         * order of magnitude above the 9 the UI's QuantitySelector allows.
         */
        @Min(1) @Max(100) Integer quantity,
        Boolean addToRecommendations,
        Boolean onlyTemporarily,
        String name
) {
    public Boolean shouldAddToRecommendations() {
        return addToRecommendations != null && addToRecommendations;
    }

    public Boolean shouldAddEndDate() {
        return onlyTemporarily != null && onlyTemporarily;
    }

    public Drink withUserId(UUID userId) {
        return new Drink(
            userId, date, alcoholTypeId, alcoholSubtypeId, alcoholVolumeId, brandId,
            beerFlavourId, consumptionTypeId, comments, quantity, addToRecommendations,
            onlyTemporarily, name
        );
    }
}

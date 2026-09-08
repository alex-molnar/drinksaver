package com.drinksaver.model.dto;


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
        Integer quantity,
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

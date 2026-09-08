package com.drinksaver.model.dto;


import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

/**
 * userId is owned by the server. It is set from the authenticated JWT subject via
 * withUserId before this reaches the repository, and READ_ONLY stops Jackson binding
 * a client-supplied value at all. Overriding it was already enough to close the IDOR;
 * refusing to bind it means a future call site that forgets to override gets a null
 * rather than whatever the caller asked for.
 */
public record Drink(
        @JsonProperty(access = JsonProperty.Access.READ_ONLY) UUID userId,
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

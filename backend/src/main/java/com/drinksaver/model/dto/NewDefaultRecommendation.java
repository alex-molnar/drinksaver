package com.drinksaver.model.dto;

import jakarta.validation.constraints.NotNull;

public record NewDefaultRecommendation (
    @NotNull String name,
    @NotNull Integer alcoholTypeId,
    Integer alcoholSubtypeId,
    Integer alcoholVolumeId,
    Integer brandId,
    Integer beerFlavourId,
    Integer consumptionTypeId,
    @NotNull Integer colorPaletteId,
    @NotNull Integer glasswareId
) {}

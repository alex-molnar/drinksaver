package com.drinksaver.model.dto.post;

import jakarta.validation.constraints.NotNull;

public record NewConsumptionType(@NotNull String name, @NotNull Integer glasswareId) {}

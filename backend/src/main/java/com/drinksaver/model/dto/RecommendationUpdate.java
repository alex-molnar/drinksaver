package com.drinksaver.model.dto;

import jakarta.validation.constraints.NotNull;

public record RecommendationUpdate(@NotNull Integer id, @NotNull String name) {}

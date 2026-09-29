package com.drinksaver.model.dto.patch;

import jakarta.validation.constraints.NotNull;

public record RecommendationUpdate(@NotNull Integer id, @NotNull String name) {}

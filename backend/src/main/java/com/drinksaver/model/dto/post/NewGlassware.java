package com.drinksaver.model.dto.post;

import jakarta.validation.constraints.NotNull;

public record NewGlassware(
        @NotNull String name,
        @NotNull String g,
        @NotNull String l,
        String f
) {}

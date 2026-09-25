package com.drinksaver.model.dto;

import jakarta.validation.constraints.NotNull;

public record NewColorPalette(
    @NotNull String name,
    @NotNull String field,
    String inkLight,
    String inkDark
) {}

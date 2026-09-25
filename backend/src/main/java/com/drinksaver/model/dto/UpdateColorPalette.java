package com.drinksaver.model.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateColorPalette(
    String name,
    String field,
    String inkLight,
    String inkDark
) {}

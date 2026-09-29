package com.drinksaver.model.dto.patch;

public record UpdateColorPalette(
    String name,
    String field,
    String inkLight,
    String inkDark
) {}

package com.drinksaver.model.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record NewBeerBrand(@NotNull String name, List<String> flavours, @NotNull Integer colorPaletteId) {}

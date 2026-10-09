package com.drinksaver.model.dto.post;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record NewBeerBrand(
    @NotNull @Size(max = 100) String name,
    List<@Size(max = 255) String> flavours,
    @NotNull Integer colorPaletteId
) {}

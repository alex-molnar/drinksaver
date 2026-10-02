package com.drinksaver.model.dto.patch;


import jakarta.validation.constraints.Size;

public record UpdateBeerFlavour (@Size(max = 100) String name, Integer colorPaletteId) {}

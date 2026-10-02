package com.drinksaver.model.dto.patch;

public record UpdateAlcoholSubtype (
    String name,
    Integer colorPaletteId,
    Integer glasswareId
){}

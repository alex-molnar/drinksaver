package com.drinksaver.model.dto;

import java.util.UUID;

public record NewAlcoholSubtype (Integer alcoholTypeId, UUID userId, String name) {}

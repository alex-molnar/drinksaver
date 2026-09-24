package com.drinksaver.model.dto;

import jakarta.validation.constraints.NotNull;

public record NewVolumeEntry(@NotNull String name, @NotNull Float volume) {}

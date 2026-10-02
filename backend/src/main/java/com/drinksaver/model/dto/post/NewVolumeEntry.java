package com.drinksaver.model.dto.post;

import jakarta.validation.constraints.NotNull;

public record NewVolumeEntry(@NotNull String name, @NotNull Float volume) {}

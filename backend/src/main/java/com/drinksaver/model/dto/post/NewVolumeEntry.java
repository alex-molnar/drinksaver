package com.drinksaver.model.dto.post;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record NewVolumeEntry(
    @NotNull @Size(max = 255) String name,
    @NotNull @DecimalMin("0.01") @DecimalMax("1.99") Float volume
) {}

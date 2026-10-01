package com.drinksaver.model.dto.post;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * No userId component. BeerController passes the authenticated JWT subject to the
 * repository itself, so a userId here was never read by anything: Jackson bound it
 * and the controller silently dropped it, which read as though it were load-bearing.
 */
public record NewBeerFlavour(@NotNull @Size(max = 100) String name, @NotNull Integer colorPaletteId) {}

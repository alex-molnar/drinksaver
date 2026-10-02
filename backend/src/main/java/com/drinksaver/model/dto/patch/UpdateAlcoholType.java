package com.drinksaver.model.dto.patch;

import com.drinksaver.model.dto.post.NewVolumeEntry;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UpdateAlcoholType(
    @Size(max = 100) String name,
    @Size(max = 50) List<Integer> volumeIds,
    Integer colorPaletteId,
    Integer glasswareId
) {}

package com.drinksaver.model.dto;

import java.util.List;
import java.util.UUID;

public record NewAlcoholEntry(UUID userId, String name, List<NewVolumeEntry> volumes, List<String> alcoholSubtypes) {}

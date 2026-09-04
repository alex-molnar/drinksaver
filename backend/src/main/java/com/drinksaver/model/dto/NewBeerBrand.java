package com.drinksaver.model.dto;

import java.util.List;
import java.util.UUID;

public record NewBeerBrand(String name, List<String> flavours) {}

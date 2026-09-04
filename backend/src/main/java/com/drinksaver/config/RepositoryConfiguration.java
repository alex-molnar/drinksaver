package com.drinksaver.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import java.util.List;
import java.util.UUID;

@ConfigurationProperties(prefix = "repository")
public record RepositoryConfiguration(
    String alcohol,
    String beer,
    String drink,
    String recommendation,
    List<UUID> adminUserList,
    Integer beerId,
    Integer maxPersonalRecommendations,
    Double decayFactor
) {}

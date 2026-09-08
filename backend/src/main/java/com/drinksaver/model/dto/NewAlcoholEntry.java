package com.drinksaver.model.dto;

import java.util.List;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

/**
 * userId is owned by the server. It is set from the authenticated JWT subject via
 * withUserId before this reaches the repository, and READ_ONLY stops Jackson binding
 * a client-supplied value at all. Overriding it was already enough to close the IDOR;
 * refusing to bind it means a future call site that forgets to override gets a null
 * rather than whatever the caller asked for.
 */
public record NewAlcoholEntry(
        @JsonProperty(access = JsonProperty.Access.READ_ONLY) UUID userId,
        String name,
        List<NewVolumeEntry> volumes,
        List<String> alcoholSubtypes
) {
    public NewAlcoholEntry withUserId(UUID userId) {
        return new NewAlcoholEntry(userId, name, volumes, alcoholSubtypes);
    }
}

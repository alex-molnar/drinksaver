package com.drinksaver.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

/**
 * userId is owned by the server. It is set from the authenticated JWT subject via
 * withUserId before this reaches the repository, and READ_ONLY stops Jackson binding
 * a client-supplied value at all. Overriding it was already enough to close the IDOR;
 * refusing to bind it means a future call site that forgets to override gets a null
 * rather than whatever the caller asked for.
 */
public record NewAlcoholSubtype(
        Integer alcoholTypeId,
        @JsonProperty(access = JsonProperty.Access.READ_ONLY) UUID userId,
        String name
) {
    public NewAlcoholSubtype withUserId(UUID userId) {
        return new NewAlcoholSubtype(alcoholTypeId, userId, name);
    }
}

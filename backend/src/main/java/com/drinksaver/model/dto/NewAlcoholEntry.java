package com.drinksaver.model.dto;

import java.util.List;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Size;

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
        @Size(max = 100) String name,
        /**
         * Bounded because createAlcoholType is @Transactional and saves these one row
         * at a time. IDENTITY ids defeat Hibernate's insert batching, so N elements is
         * N round trips holding one pooled connection for the whole loop. Unbounded,
         * a handful of concurrent requests exhausts the pool and stops the only replica.
         */
        @Size(max = 50) List<NewVolumeEntry> volumes,
        @Size(max = 50) List<String> alcoholSubtypes
) {
    public NewAlcoholEntry withUserId(UUID userId) {
        return new NewAlcoholEntry(userId, name, volumes, alcoholSubtypes);
    }
}

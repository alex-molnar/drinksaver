package com.drinksaver.model.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The IDOR fix works by overriding a client-supplied userId with the JWT subject. That is
 * enough on its own, but it puts the whole guarantee on every call site remembering to call
 * withUserId. READ_ONLY removes the client's value one step earlier, so it cannot be bound
 * at all and a call site that forgets gets a null rather than whatever the caller asked for.
 *
 * These tests exist because that is invisible in the controller tests: they pass either way,
 * since the override happens before the assertion. Deserialising the payload directly is the
 * only place the difference shows.
 */
class ServerOwnedUserIdTest {

    private static final UUID SPOOFED = UUID.fromString("11111111-1111-1111-1111-111111111111");

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void aDrinkPayloadCannotBindAUserId() throws Exception {
        String body = """
            {"userId":"%s","date":"2026-01-01","alcoholTypeId":4,"quantity":1}
            """.formatted(SPOOFED);

        Drink drink = mapper.readValue(body, Drink.class);

        assertThat(drink.userId()).isNull();
        assertThat(drink.date()).isEqualTo("2026-01-01");
        assertThat(drink.withUserId(SPOOFED).userId()).isEqualTo(SPOOFED);
    }

    @Test
    void aNewAlcoholEntryPayloadCannotBindAUserId() throws Exception {
        String body = """
            {"userId":"%s","name":"Gin","volumes":[],"alcoholSubtypes":[]}
            """.formatted(SPOOFED);

        NewAlcoholEntry entry = mapper.readValue(body, NewAlcoholEntry.class);

        assertThat(entry.userId()).isNull();
        assertThat(entry.name()).isEqualTo("Gin");
    }

    @Test
    void aNewAlcoholSubtypePayloadCannotBindAUserId() throws Exception {
        String body = """
            {"alcoholTypeId":4,"userId":"%s","name":"London Dry"}
            """.formatted(SPOOFED);

        NewAlcoholSubtype subtype = mapper.readValue(body, NewAlcoholSubtype.class);

        assertThat(subtype.userId()).isNull();
        assertThat(subtype.alcoholTypeId()).isEqualTo(4);
        assertThat(subtype.name()).isEqualTo("London Dry");
    }

    /**
     * NewBeerFlavour has no userId component at all now, so a payload carrying one is
     * simply an unknown property. Pinned because the default that makes this tolerated
     * rather than a 400 is Spring Boot's, not this record's.
     */
    @Test
    void aNewBeerFlavourPayloadCarryingAUserIdIsJustAnUnknownProperty() throws Exception {
        String body = """
            {"userId":"%s","name":"Lager"}
            """.formatted(SPOOFED);

        NewBeerFlavour flavour = mapper
            .copy()
            .disable(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .readValue(body, NewBeerFlavour.class);

        assertThat(flavour.name()).isEqualTo("Lager");
    }
}

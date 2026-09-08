package com.drinksaver.security;

import org.springframework.security.oauth2.jwt.Jwt;

import java.util.UUID;

public final class AuthenticatedUser {

    private AuthenticatedUser() {
    }

    public static UUID id(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}

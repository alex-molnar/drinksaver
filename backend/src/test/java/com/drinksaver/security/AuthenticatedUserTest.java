package com.drinksaver.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

class AuthenticatedUserTest {

    @Test
    void idReturnsTheJwtSubjectAsAUuid() {
        UUID subject = UUID.randomUUID();
        Jwt jwt = jwtWithSubject(subject.toString());

        assertThat(AuthenticatedUser.id(jwt)).isEqualTo(subject);
    }

    @Test
    void idRejectsANonUuidSubject() {
        Jwt jwt = jwtWithSubject("not-a-uuid");

        assertThatIllegalArgumentException().isThrownBy(() -> AuthenticatedUser.id(jwt));
    }

    private Jwt jwtWithSubject(String subject) {
        return Jwt.withTokenValue("token")
            .header("alg", "none")
            .subject(subject)
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(60))
            .build();
    }
}

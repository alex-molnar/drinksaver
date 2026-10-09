package com.drinksaver.model.db;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "drink_idempotency_keys",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_drink_idempotency_user_key", columnNames = {"user_id", "request_key"}
    ),
    indexes = @Index(name = "idx_drink_idempotency_expires_at", columnList = "expires_at")
)
@NoArgsConstructor
@Getter
@Setter
public class DrinkIdempotencyKey {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "request_key", nullable = false)
    private UUID requestKey;

    @Column(name = "response_json", columnDefinition = "text")
    private String responseJson;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
}

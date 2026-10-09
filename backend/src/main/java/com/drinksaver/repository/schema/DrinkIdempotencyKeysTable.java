package com.drinksaver.repository.schema;

import com.drinksaver.model.db.DrinkIdempotencyKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DrinkIdempotencyKeysTable extends JpaRepository<DrinkIdempotencyKey, Long> {

    /** Atomically claims a key, or reclaims it once its one-hour retry window expired. */
    @Modifying
    @Query(value = """
        insert into drink_idempotency_keys (user_id, request_key, expires_at)
        values (:userId, :requestKey, :expiresAt)
        on conflict (user_id, request_key) do update
            set response_json = null, expires_at = excluded.expires_at
            where drink_idempotency_keys.expires_at <= :now
        """, nativeQuery = true)
    int claim(@Param("userId") UUID userId, @Param("requestKey") UUID requestKey,
              @Param("expiresAt") Instant expiresAt, @Param("now") Instant now);

    @Query("select entry.responseJson from DrinkIdempotencyKey entry " +
        "where entry.userId = :userId and entry.requestKey = :requestKey")
    Optional<String> findResponse(@Param("userId") UUID userId, @Param("requestKey") UUID requestKey);

    @Modifying
    @Query("update DrinkIdempotencyKey entry set entry.responseJson = :response " +
        "where entry.userId = :userId and entry.requestKey = :requestKey")
    int complete(@Param("userId") UUID userId, @Param("requestKey") UUID requestKey,
                 @Param("response") String response);

    @Modifying
    @Query("delete from DrinkIdempotencyKey entry where entry.expiresAt <= :now")
    int deleteExpired(@Param("now") Instant now);
}

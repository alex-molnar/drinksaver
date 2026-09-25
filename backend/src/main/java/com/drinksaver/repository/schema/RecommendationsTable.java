package com.drinksaver.repository.schema;

import com.drinksaver.model.db.Recommendation;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface RecommendationsTable extends JpaRepository<Recommendation, Integer> {
    List<Recommendation> findByUserIdIn(List<UUID> userIds);
    @Query("SELECT t FROM Recommendation t WHERE t.userId = :userId AND (t.endDate IS NULL OR t.endDate > :dateTime) ORDER BY t.orderNumber")
    List<Recommendation> findValidByUserId(@Param("userId") UUID userId, @Param("dateTime") LocalDateTime dateTime);
    @Query("SELECT MAX(t.orderNumber) FROM Recommendation t WHERE t.userId = :userId AND t.endDate IS NULL")
    List<Integer> findNonTemporaryByUserId(@Param("userId") UUID userId);

    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            UPDATE recommendations AS r
            SET order_number = ordered.order_number, name = ordered.name
            FROM (
                SELECT id,
                       name,
                       row_number() OVER (ORDER BY ordinal)::integer AS order_number
                FROM (
                    SELECT DISTINCT ON (ids.id) ids.id, ids.name, ids.ordinal
                    FROM unnest(
                        CAST(:recommendationIds AS integer[]),
                        CAST(:recommendationNames AS text[])
                    )
                        WITH ORDINALITY AS ids(id, name, ordinal)
                    ORDER BY ids.id, ids.ordinal
                ) AS unique_ids
                WHERE EXISTS (
                    SELECT 1
                    FROM recommendations AS existing
                    WHERE existing.id = unique_ids.id
                )
            ) AS ordered
            WHERE ordered.id = r.id
            """, nativeQuery = true)
    int updateRecommendationsOrderArray(@Param("recommendationIds") Integer[] recommendationIds, @Param("recommendationNames") String[] recommendationNames);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    long countByColorPaletteId(Integer colorPaletteId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    long countByGlasswareId(Integer glasswareId);
}

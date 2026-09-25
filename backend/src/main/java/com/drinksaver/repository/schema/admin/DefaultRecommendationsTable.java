package com.drinksaver.repository.schema.admin;

import java.util.List;

import com.drinksaver.model.db.admin.DefaultRecommendation;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface DefaultRecommendationsTable extends JpaRepository<DefaultRecommendation, Integer> {
    @Query("SELECT MAX(r.orderNumber) FROM DefaultRecommendation r")
    Integer getLargestOrderNumber();

    List<DefaultRecommendation> findAllByOrderByOrderNumberAsc();

    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            UPDATE default_recommendations AS r
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
                    FROM default_recommendations AS existing
                    WHERE existing.id = unique_ids.id
                )
            ) AS ordered
            WHERE ordered.id = r.id
            """, nativeQuery = true)  // TODO return result
    int updateDefaultRecommendationsOrderArray(@Param("recommendationIds") Integer[] recommendationIds, @Param("recommendationNames") String[] recommendationNames);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    long countByColorPaletteId(Integer colorPaletteId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    long countByGlasswareId(Integer glasswareId);
}

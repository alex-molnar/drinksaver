package com.drinksaver.repository.postgres.schema;

import com.drinksaver.model.db.Recommendation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface RecommendationsTable extends JpaRepository<Recommendation, Integer> {
    List<Recommendation> findByUserIdIn(List<UUID> userIds);
    @Query("SELECT t FROM Recommendation t WHERE t.userId = :userId AND (t.endDate IS NULL OR t.endDate > :dateTime)")
    List<Recommendation> findValidByUserId(@Param("userId") UUID userId, @Param("dateTime") LocalDateTime dateTime);
}

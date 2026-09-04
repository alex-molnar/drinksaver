package com.drinksaver.repository.postgres.schema;

import com.drinksaver.model.db.SavedDrink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface SavedDrinksTable extends JpaRepository<SavedDrink, Integer> {
    List<SavedDrink> findByUserId(UUID userId);
    List<SavedDrink> findByUserIdAndDate(UUID userId, String date);
    @Transactional
    @Modifying
    @Query("delete from SavedDrink s where s.id in :ids")
    int deleteAndCountByIds(@Param("ids") List<Integer> ids);
}

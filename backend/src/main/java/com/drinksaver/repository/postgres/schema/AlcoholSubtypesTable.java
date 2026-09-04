package com.drinksaver.repository.postgres.schema;

import com.drinksaver.model.db.AlcoholSubtype;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AlcoholSubtypesTable extends JpaRepository<AlcoholSubtype, Integer> {
    List<AlcoholSubtype> findAllByAlcoholTypeIdAndUserIdInOrderByNameAsc(Integer alcoholTypeId, List<UUID> userId);
}

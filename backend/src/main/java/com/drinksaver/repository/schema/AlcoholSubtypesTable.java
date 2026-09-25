package com.drinksaver.repository.schema;

import com.drinksaver.model.db.AlcoholSubtype;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AlcoholSubtypesTable extends JpaRepository<AlcoholSubtype, Integer> {
    List<AlcoholSubtype> findAllByAlcoholTypeIdAndUserIdInOrderByNameAsc(Integer alcoholTypeId, List<UUID> userId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    long countByColorPaletteId(Integer colorPaletteId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    long countByGlasswareId(Integer glasswareId);
}

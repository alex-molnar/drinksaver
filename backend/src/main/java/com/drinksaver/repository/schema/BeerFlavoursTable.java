package com.drinksaver.repository.schema;

import com.drinksaver.model.db.BeerFlavour;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BeerFlavoursTable extends JpaRepository<BeerFlavour, Integer> {
    List<BeerFlavour> findAllByBrandIdAndUserIdIn(Integer brandId, List<UUID> userId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    long countByColorPaletteId(Integer colorPaletteId);
}

package com.drinksaver.repository.postgres.schema;

import com.drinksaver.model.db.BeerFlavour;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BeerFlavoursTable extends JpaRepository<BeerFlavour, Integer> {
    List<BeerFlavour> findAllByBrandIdAndUserIdIn(Integer brandId, List<UUID> userId);
}

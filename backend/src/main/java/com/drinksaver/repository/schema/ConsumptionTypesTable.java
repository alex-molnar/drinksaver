package com.drinksaver.repository.schema;

import com.drinksaver.model.db.ConsumptionType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

@Repository
public interface ConsumptionTypesTable extends JpaRepository<ConsumptionType, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    long countByGlasswareId(Integer glasswareId);
}

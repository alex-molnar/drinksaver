package com.drinksaver.repository.postgres.schema;

import com.drinksaver.model.db.ConsumptionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConsumptionTypesTable extends JpaRepository<ConsumptionType, Integer> {}

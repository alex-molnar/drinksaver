package com.drinksaver.repository.postgres.schema;

import com.drinksaver.model.db.AlcoholType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface AlcoholTypesTable extends JpaRepository<AlcoholType, Integer> {
    List<AlcoholType> findAllByUserIdInOrderByNameAsc(Collection<UUID> userIds);
}

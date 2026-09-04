package com.drinksaver.repository.postgres.schema;

import com.drinksaver.model.db.Brand;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface BrandsTable extends JpaRepository<Brand, Integer> {
    List<Brand> findAllByUserIdInOrderByName(Collection<UUID> userIds);
}

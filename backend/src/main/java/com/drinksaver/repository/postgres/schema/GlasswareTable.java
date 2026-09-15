package com.drinksaver.repository.postgres.schema;

import com.drinksaver.model.db.Glassware;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GlasswareTable extends JpaRepository<Glassware, Integer> {
}

package com.drinksaver.repository.postgres.schema;


import com.drinksaver.model.db.ColorPalette;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ColorPalettesTable extends JpaRepository<ColorPalette, Integer> {
}

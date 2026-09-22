package com.drinksaver.repository.schema;

import com.drinksaver.model.db.AlcoholVolume;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AlcoholVolumeTable extends JpaRepository<AlcoholVolume, Integer> {}

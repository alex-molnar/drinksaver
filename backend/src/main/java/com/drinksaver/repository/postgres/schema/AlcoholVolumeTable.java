package com.drinksaver.repository.postgres.schema;

import com.drinksaver.model.db.AlcoholVolume;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlcoholVolumeTable extends JpaRepository<AlcoholVolume, Integer> {}

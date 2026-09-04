package com.drinksaver.model.db;

import com.drinksaver.model.dto.NewVolumeEntry;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "alcohol_volumes")
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class AlcoholVolume {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    public AlcoholVolume(String name, Float volume) {
        this.name = name;
        this.volume = volume;
    }

    private String name;
    private Float volume;

    public static AlcoholVolume of(NewVolumeEntry entry) {
        return new AlcoholVolume(entry.name(), entry.volume());
    }
}

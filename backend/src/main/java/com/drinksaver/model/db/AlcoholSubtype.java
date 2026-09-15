package com.drinksaver.model.db;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.net.Inet4Address;
import java.util.UUID;

@Entity
@Table(name = "alcohol_subtypes")
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class AlcoholSubtype {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer alcoholTypeId;
    private UUID userId;
    private String name;
    private Integer colorPaletteId;
    private Integer glasswareId;

    public AlcoholSubtype(Integer alcoholTypeId, UUID userId, String name) {
        this.alcoholTypeId = alcoholTypeId;
        this.userId = userId;
        this.name = name;
    }

    public AlcoholSubtype(Integer alcoholTypeId, UUID userId, String name, Integer colorPaletteId, Integer glasswareId) {
        this.alcoholTypeId = alcoholTypeId;
        this.userId = userId;
        this.name = name;
        this.colorPaletteId = colorPaletteId;
        this.glasswareId = glasswareId;
    }
}

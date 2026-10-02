package com.drinksaver.model.db;

import com.drinksaver.model.dto.patch.UpdateBeerBrand;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "brands")
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class Brand {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private UUID userId;
    private String name;
    private Integer colorPaletteId;

    public Brand(UUID userId, String name, Integer colorPaletteId) {
        this.userId = userId;
        this.name = name;
        this.colorPaletteId = colorPaletteId;
    }

    public Brand withUpdate(UpdateBeerBrand updateBeerBrand) {
        if (updateBeerBrand.name() != null) {
            this.name = updateBeerBrand.name();
        }
        if (updateBeerBrand.colorPaletteId() != null) {
            this.colorPaletteId = updateBeerBrand.colorPaletteId();
        }
        return this;
    }

    public Brand withUserId(UUID userId) {
        this.userId = userId;
        return this;
    }
}

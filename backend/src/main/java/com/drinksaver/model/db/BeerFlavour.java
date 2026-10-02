package com.drinksaver.model.db;

import com.drinksaver.model.dto.patch.UpdateBeerFlavour;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "beer_flavours")
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class BeerFlavour {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private Integer brandId;
    private UUID userId;
    private String name;
    private Integer colorPaletteId;

    public BeerFlavour(Integer brandId, UUID userId, String name) {
        this.brandId = brandId;
        this.userId = userId;
        this.name = name;
    }

    public BeerFlavour(Integer brandId, UUID userId, String name, Integer colorPaletteId) {
        this.brandId = brandId;
        this.userId = userId;
        this.name = name;
        this.colorPaletteId = colorPaletteId;
    }

    public BeerFlavour withUpdate(UpdateBeerFlavour updateBeerFlavour) {
        if (updateBeerFlavour.name() != null) {
            this.name = updateBeerFlavour.name();
        }
        if (updateBeerFlavour.colorPaletteId() != null) {
            this.colorPaletteId = updateBeerFlavour.colorPaletteId();
        }
        return this;
    }

    public BeerFlavour withUserId(UUID userId) {
        this.userId = userId;
        return this;
    }
}

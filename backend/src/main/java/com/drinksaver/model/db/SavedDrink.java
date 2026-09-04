package com.drinksaver.model.db;

import com.drinksaver.model.dto.Drink;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "saved_drinks")
@NoArgsConstructor
@Getter
@Setter
public class SavedDrink {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private UUID userId;
    private String date;
    private Integer alcoholTypeId;
    private Integer alcoholSubtypeId;
    private Integer alcoholVolumeId;
    private Integer brandId;
    private Integer beerFlavourId;
    private Integer consumptionTypeId;
    private String comments;

    public SavedDrink(UUID userId, String date, Integer alcoholTypeId, Integer alcoholSubtypeId, Integer alcoholVolumeId, Integer brandId, Integer beerFlavourId, Integer consumptionTypeId, String comments) {
        this.userId = userId;
        this.date = date;
        this.alcoholTypeId = alcoholTypeId;
        this.alcoholSubtypeId = alcoholSubtypeId;
        this.alcoholVolumeId = alcoholVolumeId;
        this.brandId = brandId;
        this.beerFlavourId = beerFlavourId;
        this.consumptionTypeId = consumptionTypeId;
        this.comments = comments;
    }

    public static SavedDrink of(Drink drink) {
        return new SavedDrink(
                drink.userId(),
                drink.date(),
                drink.alcoholTypeId(),
                drink.alcoholSubtypeId(),
                drink.alcoholVolumeId(),
                drink.brandId(),
                drink.beerFlavourId(),
                drink.consumptionTypeId(),
                drink.comments()
        );
    }
}

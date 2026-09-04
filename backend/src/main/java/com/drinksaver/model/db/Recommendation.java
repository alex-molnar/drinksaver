package com.drinksaver.model.db;

import com.drinksaver.model.dto.Drink;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "recommendations")
@NoArgsConstructor
@Getter
@Setter
public class Recommendation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private UUID userId;
    private String name;
    private Integer alcoholTypeId;
    private Integer alcoholSubtypeId;
    private Integer alcoholVolumeId;
    private Integer brandId;
    private Integer beerFlavourId;
    private Integer consumptionTypeId;
    private LocalDateTime endDate;

    public static Recommendation of(Drink drink) {
        Recommendation recommendation = new Recommendation();
        recommendation.setUserId(drink.userId());
        recommendation.setName(drink.name());
        recommendation.setAlcoholTypeId(drink.alcoholTypeId());
        recommendation.setAlcoholSubtypeId(drink.alcoholSubtypeId());
        recommendation.setAlcoholVolumeId(drink.alcoholVolumeId());
        recommendation.setBrandId(drink.brandId());
        recommendation.setBeerFlavourId(drink.beerFlavourId());
        recommendation.setConsumptionTypeId(drink.consumptionTypeId());
        if (drink.shouldAddEndDate())
            recommendation.setEndDate(LocalDateTime.now().plusHours(24));
        return recommendation;
    }
}

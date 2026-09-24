package com.drinksaver.model.db.admin;

import com.drinksaver.model.dto.NewDefaultRecommendation;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "default_recommendations")
@NoArgsConstructor
@Getter
@Setter
public class DefaultRecommendation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;
    private Integer alcoholTypeId;
    private Integer alcoholSubtypeId;
    private Integer alcoholVolumeId;
    private Integer brandId;
    private Integer beerFlavourId;
    private Integer consumptionTypeId;
    private Integer colorPaletteId;
    private Integer glasswareId;
    private Integer orderNumber;

    public static DefaultRecommendation of(NewDefaultRecommendation newDefaultRecommendation, Integer maxOrderNumber) {
        DefaultRecommendation recommendation =  new DefaultRecommendation();
        recommendation.setName(newDefaultRecommendation.name());
        recommendation.setAlcoholTypeId(newDefaultRecommendation.alcoholTypeId());
        recommendation.setAlcoholSubtypeId(newDefaultRecommendation.alcoholSubtypeId());
        recommendation.setAlcoholVolumeId(newDefaultRecommendation.alcoholVolumeId());
        recommendation.setBrandId(newDefaultRecommendation.brandId());
        recommendation.setBeerFlavourId(newDefaultRecommendation.beerFlavourId());
        recommendation.setConsumptionTypeId(newDefaultRecommendation.consumptionTypeId());
        recommendation.setColorPaletteId(newDefaultRecommendation.colorPaletteId());
        recommendation.setGlasswareId(newDefaultRecommendation.glasswareId());
        recommendation.setOrderNumber(maxOrderNumber != null ? maxOrderNumber + 1 : 1);
        return recommendation;
    }
}

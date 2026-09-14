package com.drinksaver.model.db;

import com.drinksaver.model.dto.Drink;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Objects;
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
    private Integer colorPaletteId;
    private Integer glasswareId;
    private Integer orderNumber;

    /**
     * Identity is the drink itself, never its name. The same drink reaches us
     * from several sources: the saved-drinks history has no name, a stored
     * recommendation has one, and the name collectors add one later. All of
     * those must compare as one key so their scores merge.
     */
    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (other == null || getClass() != other.getClass()) return false;
        Recommendation recommendation = (Recommendation) other;
        return Objects.equals(alcoholTypeId, recommendation.alcoholTypeId) &&
                Objects.equals(alcoholSubtypeId, recommendation.alcoholSubtypeId) &&
                Objects.equals(alcoholVolumeId, recommendation.alcoholVolumeId) &&
                Objects.equals(brandId, recommendation.brandId) &&
                Objects.equals(beerFlavourId, recommendation.beerFlavourId) &&
                Objects.equals(consumptionTypeId, recommendation.consumptionTypeId);
    }

    /**
     * Must exclude `name` for exactly the same reason equals does. The record's
     * generated hashCode included it, so two keys that were equal could hash
     * differently, land in different HashMap buckets and never be compared.
     * Since this type is used as the key in the Collectors.toMap calls that
     * merge recommendation sources, that silently defeated the merge.
     */
    @Override
    public int hashCode() {
        return Objects.hash(
                alcoholTypeId,
                alcoholSubtypeId,
                alcoholVolumeId,
                brandId,
                beerFlavourId,
                consumptionTypeId
        );
    }

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
        recommendation.setGlasswareId(1); // TODO default change it
        recommendation.setColorPaletteId(3); // TODO default change it
        recommendation.setOrderNumber(5); // TODO default change it
        return recommendation;
    }
}

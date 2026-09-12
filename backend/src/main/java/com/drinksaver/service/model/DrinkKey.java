package com.drinksaver.service.model;

import com.drinksaver.model.db.Recommendation;
import com.drinksaver.model.db.SavedDrink;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

public record DrinkKey(
        Integer alcoholTypeId,
        Integer alcoholSubtypeId,
        Integer alcoholVolumeId,
        Integer brandId,
        Integer beerFlavourId,
        Integer consumptionTypeId,
        Integer colorPaletteId,
        Integer glasswareId,
        Optional<String> name
) {
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
        DrinkKey drinkKey = (DrinkKey) other;
        return Objects.equals(alcoholTypeId, drinkKey.alcoholTypeId) &&
                Objects.equals(alcoholSubtypeId, drinkKey.alcoholSubtypeId) &&
                Objects.equals(alcoholVolumeId, drinkKey.alcoholVolumeId) &&
                Objects.equals(brandId, drinkKey.brandId) &&
                Objects.equals(beerFlavourId, drinkKey.beerFlavourId) &&
                Objects.equals(consumptionTypeId, drinkKey.consumptionTypeId);
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

    public Recommendation toRecommendation(UUID userId) {
        Recommendation recommendation = new Recommendation();
        recommendation.setUserId(userId);
        recommendation.setName(name.orElse("Couldn't generate name"));
        recommendation.setAlcoholTypeId(alcoholTypeId);
        recommendation.setAlcoholSubtypeId(alcoholSubtypeId);
        recommendation.setAlcoholVolumeId(alcoholVolumeId);
        recommendation.setBrandId(brandId);
        recommendation.setBeerFlavourId(beerFlavourId);
        recommendation.setConsumptionTypeId(consumptionTypeId);
        recommendation.setColorPaletteId(colorPaletteId);
        recommendation.setGlasswareId(glasswareId);
        return recommendation;
    }

    public DrinkKey withName(String name) {
        return new DrinkKey(
                alcoholTypeId,
                alcoholSubtypeId,
                alcoholVolumeId,
                brandId,
                beerFlavourId,
                consumptionTypeId,
                colorPaletteId,
                glasswareId,
                Optional.of(name)
        );
    }

    public static DrinkKey of(SavedDrink drink) {
        return new DrinkKey(
                drink.getAlcoholTypeId(),
                drink.getAlcoholSubtypeId(),
                drink.getAlcoholVolumeId(),
                drink.getBrandId(),
                drink.getBeerFlavourId(),
                drink.getConsumptionTypeId(),
                3,  // TODO Set this properly, right now it defaults
                1,  // TODO Set this properly, right now it defaults
                Optional.empty()
        );
    }

    public static DrinkKey of(Recommendation recommendation) {
        return new DrinkKey(
                recommendation.getAlcoholTypeId(),
                recommendation.getAlcoholSubtypeId(),
                recommendation.getAlcoholVolumeId(),
                recommendation.getBrandId(),
                recommendation.getBeerFlavourId(),
                recommendation.getConsumptionTypeId(),
                recommendation.getColorPaletteId(),
                recommendation.getGlasswareId(),
                Optional.ofNullable(recommendation.getName())
        );
    }
}

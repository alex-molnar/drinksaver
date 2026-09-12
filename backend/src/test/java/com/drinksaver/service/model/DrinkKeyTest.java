package com.drinksaver.service.model;

import com.drinksaver.model.db.Recommendation;
import com.drinksaver.model.db.SavedDrink;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * DrinkKey deliberately excludes `name` from equals, so that the same drink
 * arriving from two sources (one that knows its name, one that does not)
 * collapses to a single key. That only works if hashCode makes the same
 * exclusion: HashMap picks the bucket by hash and only then compares with
 * equals, so a hash that includes `name` sends equal keys to different buckets
 * and they never meet.
 */
class DrinkKeyTest {

    private static final UUID USER = UUID.randomUUID();

    private DrinkKey namelessBeer() {
        return new DrinkKey(4, null, 6, 1, 1, 3, null, null, Optional.empty());
    }

    private DrinkKey namedBeer(String name) {
        return new DrinkKey(4, null, 6, 1, 1, 3, null, null, Optional.of(name));
    }

    @Test
    void keysDifferingOnlyByNameAreEqual() {
        assertThat(namedBeer("Heineken pint")).isEqualTo(namelessBeer());
    }

    @Test
    void equalKeysHaveEqualHashCodes() {
        assertThat(namedBeer("Heineken pint")).hasSameHashCodeAs(namelessBeer());
    }

    @Test
    void twoNamesForTheSameDrinkStillHashAlike() {
        assertThat(namedBeer("Heineken pint")).hasSameHashCodeAs(namedBeer("A pint of Heineken"));
    }

    @Test
    void aHashMapTreatsThemAsOneKey() {
        Map<DrinkKey, Double> scores = new HashMap<>();
        scores.put(namelessBeer(), 1.0);
        scores.merge(namedBeer("Heineken pint"), 2.0, Double::sum);

        assertThat(scores).hasSize(1);
        assertThat(scores.values()).containsExactly(3.0);
    }

    @Test
    void aHashSetDeduplicatesThem() {
        assertThat(new HashSet<>(java.util.List.of(namelessBeer(), namedBeer("Heineken pint")))).hasSize(1);
    }

    @Test
    void genuinelyDifferentDrinksStayDistinct() {
        DrinkKey gin = new DrinkKey(1, 1, 2, null, null, null, null, null, Optional.empty());

        assertThat(gin).isNotEqualTo(namelessBeer());
        Map<DrinkKey, Double> scores = new HashMap<>();
        scores.put(namelessBeer(), 1.0);
        scores.put(gin, 1.0);
        assertThat(scores).hasSize(2);
    }

    @Test
    void keysBuiltFromADrinkAndFromARecommendationMeet() {
        SavedDrink drink = new SavedDrink(USER, "2026-03-15", 4, null, 6, 1, 1, 3, null);

        Recommendation recommendation = new Recommendation();
        recommendation.setUserId(USER);
        recommendation.setName("Heineken pint");
        recommendation.setAlcoholTypeId(4);
        recommendation.setAlcoholVolumeId(6);
        recommendation.setBrandId(1);
        recommendation.setBeerFlavourId(1);
        recommendation.setConsumptionTypeId(3);

        DrinkKey fromDrink = DrinkKey.of(drink);
        DrinkKey fromRecommendation = DrinkKey.of(recommendation);

        assertThat(fromDrink).isEqualTo(fromRecommendation);
        assertThat(fromDrink).hasSameHashCodeAs(fromRecommendation);

        Map<DrinkKey, Double> merged = new HashMap<>();
        merged.merge(fromRecommendation, 0.0, Math::max);
        merged.merge(fromDrink, 0.9, Math::max);
        assertThat(merged).hasSize(1);
    }

    @Test
    void withNameDoesNotChangeIdentity() {
        DrinkKey key = namelessBeer();
        DrinkKey renamed = key.withName("Heineken pint");

        assertThat(renamed).isEqualTo(key);
        assertThat(renamed).hasSameHashCodeAs(key);
        assertThat(renamed.name()).contains("Heineken pint");
    }
}

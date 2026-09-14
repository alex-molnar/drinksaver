package com.drinksaver.service.recommendations;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.Recommendation;
import com.drinksaver.repository.postgres.schema.SavedDrinksTable;
import com.drinksaver.service.model.DrinkKey;
import com.drinksaver.service.namecollector.AlcoholNameCollector;
import com.drinksaver.service.namecollector.BeerNameCollector;
import com.drinksaver.service.recommendations.api.RecommendationSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class DynamicPersonalRecommendationSource implements RecommendationSource {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;

    private final RepositoryConfiguration repositoryConfiguration;
    private final SavedDrinksTable savedDrinksTable;
    private final BeerNameCollector beerNameCollector;
    private final AlcoholNameCollector alcoholNameCollector;
    private final Clock clock;

    @Autowired
    public DynamicPersonalRecommendationSource(
        RepositoryConfiguration repositoryConfiguration,
        SavedDrinksTable savedDrinksTable,
        BeerNameCollector beerNameCollector,
        AlcoholNameCollector alcoholNameCollector
    ) {
        this(repositoryConfiguration, savedDrinksTable, beerNameCollector, alcoholNameCollector, Clock.systemDefaultZone());
    }

    /**
     * Lets a test pin "today". Without it the test and this class each call
     * LocalDate.now() independently, so a run that straddles midnight sees a
     * one-day difference and the decay assertions fail.
     */
    DynamicPersonalRecommendationSource(
        RepositoryConfiguration repositoryConfiguration,
        SavedDrinksTable savedDrinksTable,
        BeerNameCollector beerNameCollector,
        AlcoholNameCollector alcoholNameCollector,
        Clock clock
    ) {
        this.repositoryConfiguration = repositoryConfiguration;
        this.savedDrinksTable = savedDrinksTable;
        this.beerNameCollector = beerNameCollector;
        this.alcoholNameCollector = alcoholNameCollector;
        this.clock = clock;
    }

    @Override
    public Stream<Recommendation> buildRecommendation(UUID userId, Stream<Recommendation> processed) {
        LocalDate today = LocalDate.now(clock);

        System.out.println("\nDynamic\n");

        return Stream.concat(
            processed,
            savedDrinksTable
                .findByUserId(userId)
                .stream()
                .map(drink -> new AbstractMap.SimpleEntry<>(
                    DrinkKey.of(drink),
                    Math.pow(repositoryConfiguration.decayFactor(), calculateDaysSince(drink.getDate(), today))
                ))
                .collect(Collectors.toMap(
                    Map.Entry::getKey,
                    Map.Entry::getValue,
                    Double::sum
                ))
                .entrySet()
                .stream()
                .sorted(Map.Entry.comparingByValue())
                .map(e -> withName(e.getKey()).toRecommendation(userId))
        )
        .distinct()
        .peek(e -> System.out.printf("%s: %s%n", e.getName(), e)); // TODO peek
    }

    @Override
    public Integer orderId() {
        return 1;
    }

    private long calculateDaysSince(String dateStr, LocalDate today) {
        if (dateStr == null || dateStr.isBlank()) {
            return 30; // Default to 30 days for missing dates
        }
        try {
            LocalDate drinkDate = LocalDate.parse(dateStr, DATE_FORMATTER);
            return Math.max(0, ChronoUnit.DAYS.between(drinkDate, today));
        } catch (DateTimeParseException e) {
            return 30; // Default for unparseable dates
        }
    }

    private DrinkKey withName(DrinkKey key) {
        if (key.name().isPresent()) {
            return key;
        }

        try {
            return Objects.equals(key.alcoholTypeId(), repositoryConfiguration.beerId())
                    ? beerNameCollector.collectBeerName(key)
                    : alcoholNameCollector.collectAlcoholName(key);
        } catch (Exception e) {
            return key;
        }
    }
}

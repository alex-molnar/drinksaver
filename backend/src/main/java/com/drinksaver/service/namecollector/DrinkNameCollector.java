package com.drinksaver.service.namecollector;


import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.Recommendation;
import com.drinksaver.service.model.DrinkKey;
import org.springframework.stereotype.Service;

import java.util.Objects;

@Service
public class DrinkNameCollector {
    private final RepositoryConfiguration repositoryConfiguration;
    private final BeerNameCollector beerNameCollector;
    private final AlcoholNameCollector alcoholNameCollector;

    public DrinkNameCollector(
        RepositoryConfiguration repositoryConfiguration,
        BeerNameCollector beerNameCollector,
        AlcoholNameCollector alcoholNameCollector
    ) {
        this.beerNameCollector = beerNameCollector;
        this.alcoholNameCollector = alcoholNameCollector;
        this.repositoryConfiguration = repositoryConfiguration;
    }

    public DrinkKey withName(DrinkKey key) {
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

    public Recommendation withName(Recommendation key) {
        if (key.getName() != null) {
            return key;
        }

        try {
            return Objects.equals(key.getAlcoholTypeId(), repositoryConfiguration.beerId())
                    ? beerNameCollector.collectBeerName(key)
                    : alcoholNameCollector.collectAlcoholName(key);
        } catch (Exception e) {
            return key;
        }
    }
}

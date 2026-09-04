package com.drinksaver.controller;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.SavedDrink;
import com.drinksaver.model.dto.Drink;
import com.drinksaver.model.dto.EditableDrink;
import com.drinksaver.repository.DrinksRepository;
import com.drinksaver.service.InjectorService;
import com.drinksaver.service.RecommendationCacheService;
import com.drinksaver.service.model.DrinkKey;
import com.drinksaver.service.namecollector.AlcoholNameCollector;
import com.drinksaver.service.namecollector.BeerNameCollector;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/drinks")
public class DrinksController {

    private final DrinksRepository drinksRepository;
    private final RecommendationCacheService recommendationCacheService;
    private final AlcoholNameCollector alcoholNameCollector;
    private final BeerNameCollector beerNameCollector;
    private final RepositoryConfiguration repositoryConfiguration;

    @Autowired
    public DrinksController(
        InjectorService injectorService,
        RecommendationCacheService recommendationCacheService,
        AlcoholNameCollector alcoholNameCollector,
        BeerNameCollector beerNameCollector,
        RepositoryConfiguration repositoryConfiguration
    ) {
        this.drinksRepository = injectorService.getDrinksRepository();
        this.recommendationCacheService = recommendationCacheService;
        this.alcoholNameCollector = alcoholNameCollector;
        this.beerNameCollector = beerNameCollector;
        this.repositoryConfiguration = repositoryConfiguration;
    }

    @PostMapping("/new")
    public SavedDrink saveDrink(@RequestBody Drink drink) {
        SavedDrink saved = drinksRepository.saveDrink(drink);
        recommendationCacheService.onDrinkSaved(drink);
        return saved;
    }

    @GetMapping("/{userId}/date/{date}")
    public List<EditableDrink> getSavedDrinks(@PathVariable UUID userId, @PathVariable String date) {
        return drinksRepository
            .getSavedDrinks(userId, date)
                .stream()
                .map(savedDrink -> {
                    final String name =  savedDrink.getAlcoholTypeId().equals(repositoryConfiguration.beerId())
                            ? beerNameCollector.collectBeerName(DrinkKey.of(savedDrink)).name().orElse("Unknown drink")
                            : alcoholNameCollector.collectAlcoholName(DrinkKey.of(savedDrink)).name().orElse("Unknown drink");
                    return new EditableDrink(savedDrink.getId(), name,  savedDrink.getAlcoholTypeId());
                })
                .toList();
    }

    @DeleteMapping("/byIds")
    public int deleteSavedDrink(@RequestParam List<Integer> drinkIds) {
        return drinksRepository.deleteSavedDrink(drinkIds);
    }
}


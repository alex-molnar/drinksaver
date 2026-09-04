package com.drinksaver.controller;

import com.drinksaver.model.db.BeerFlavour;
import com.drinksaver.model.db.Brand;
import com.drinksaver.model.db.ConsumptionType;
import com.drinksaver.model.dto.NewBeerBrand;
import com.drinksaver.model.dto.NewBeerFlavour;
import com.drinksaver.repository.BeerRepository;
import com.drinksaver.service.InjectorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/beer")
public class BeerController {

    private final BeerRepository beerRepository;

    @Autowired
    public BeerController(InjectorService injectorService) {
        this.beerRepository = injectorService.getBeerRepository();
    }

    @GetMapping("/brands")
    public List<Brand> getBrandsList(@RequestParam(defaultValue = "10") UUID userId) {
        return beerRepository.getBrands(userId);
    }

    @GetMapping("/consumption-types")
    public List<ConsumptionType> getConsumptionTypesList(@RequestParam(defaultValue = "10") Integer amount) {
        return beerRepository.getConsumptionTypes(amount);
    }

    @PostMapping("/{userId}/brands")
    public Brand saveBrand(@PathVariable UUID userId, @RequestBody NewBeerBrand newBeerBrand) {
        return beerRepository.saveBrand(userId, newBeerBrand.name(), newBeerBrand.flavours());
    }

    @GetMapping("/brands/{brandId}/flavours")
    public List<BeerFlavour> getBrandNames(@PathVariable Integer brandId, @RequestParam UUID userId) {
        return beerRepository.getBeerFlavours(brandId, userId);
    }

    @PostMapping("/brands/{brandId}/flavours")
    public BeerFlavour saveBrandName(@PathVariable Integer brandId, @RequestBody NewBeerFlavour newBeerFlavour) {
        return beerRepository.saveBeerFlavour(brandId, newBeerFlavour.userId(), newBeerFlavour.name());

    }
}


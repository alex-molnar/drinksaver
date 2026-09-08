package com.drinksaver.controller;

import com.drinksaver.model.db.BeerFlavour;
import com.drinksaver.model.db.Brand;
import com.drinksaver.model.db.ConsumptionType;
import com.drinksaver.model.dto.NewBeerBrand;
import com.drinksaver.model.dto.NewBeerFlavour;
import com.drinksaver.repository.BeerRepository;
import com.drinksaver.security.AuthenticatedUser;
import com.drinksaver.service.InjectorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/beer")
public class BeerController {

    private final BeerRepository beerRepository;

    @Autowired
    public BeerController(InjectorService injectorService) {
        this.beerRepository = injectorService.getBeerRepository();
    }

    @GetMapping("/brands")
    public List<Brand> getBrandsList(@AuthenticationPrincipal Jwt jwt) {
        return beerRepository.getBrands(AuthenticatedUser.id(jwt));
    }

    @GetMapping("/consumption-types")
    public List<ConsumptionType> getConsumptionTypesList(@RequestParam(defaultValue = "10") Integer amount) {
        return beerRepository.getConsumptionTypes(amount);
    }

    @PostMapping("/brands")
    public Brand saveBrand(@AuthenticationPrincipal Jwt jwt, @RequestBody NewBeerBrand newBeerBrand) {
        return beerRepository.saveBrand(AuthenticatedUser.id(jwt), newBeerBrand.name(), newBeerBrand.flavours());
    }

    @GetMapping("/brands/{brandId}/flavours")
    public List<BeerFlavour> getBrandNames(@AuthenticationPrincipal Jwt jwt, @PathVariable Integer brandId) {
        return beerRepository.getBeerFlavours(brandId, AuthenticatedUser.id(jwt));
    }

    @PostMapping("/brands/{brandId}/flavours")
    public BeerFlavour saveBrandName(@AuthenticationPrincipal Jwt jwt, @PathVariable Integer brandId, @RequestBody NewBeerFlavour newBeerFlavour) {
        return beerRepository.saveBeerFlavour(brandId, AuthenticatedUser.id(jwt), newBeerFlavour.name());
    }
}


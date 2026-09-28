package com.drinksaver.controller.admin;

import com.drinksaver.model.db.BeerFlavour;
import com.drinksaver.model.db.Brand;
import com.drinksaver.model.db.ConsumptionType;
import com.drinksaver.repository.BeerRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/v1/admin/default/beer")
public class AdminBeerDefaultController {
    private final BeerRepository beerRepository;

    public AdminBeerDefaultController(BeerRepository beerRepository) {
        this.beerRepository = beerRepository;
    }

    @GetMapping("/brands")
    public List<Brand> getDefaultBeerBrands() {
        return beerRepository.getAdminBrands();
    }

    @GetMapping("/brands/{brandId}/flavours")
    public List<BeerFlavour> getDefaultBeerFlavours(@PathVariable Integer brandId) {
        return  beerRepository.getAdminBeerFlavours(brandId);
    }

    @GetMapping("/consumption-types")
    public List<ConsumptionType> getDefaultBeerConsumptionTypes() {
        return beerRepository.getConsumptionTypes(10);
    }

    // TODO PATCH/POST
}

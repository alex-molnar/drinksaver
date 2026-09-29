package com.drinksaver.controller.admin;

import com.drinksaver.model.db.BeerFlavour;
import com.drinksaver.model.db.Brand;
import com.drinksaver.repository.BeerRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/v1/admin/user-defined/beer")
public class AdminBeerUserController {
    private final BeerRepository beerRepository;

    public AdminBeerUserController(BeerRepository beerRepository) {
        this.beerRepository = beerRepository;
    }

    @GetMapping("/brands")
    public List<Brand> getUserDefinedBeerBrands() {
        return beerRepository.getUserDefinedBrands();
    }

    @GetMapping("/brands/{brandId}/flavours")
    public List<BeerFlavour> getUserDefinedBeerFlavours(@PathVariable Integer brandId) {
        return  beerRepository.getUserDefinedBeerFlavours(brandId);
    }

    // TODO PATCH/POST
}

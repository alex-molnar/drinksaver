package com.drinksaver.controller.admin;

import com.drinksaver.model.db.BeerFlavour;
import com.drinksaver.model.db.Brand;
import com.drinksaver.repository.BeerRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
        return  beerRepository.getUserDefinedBeerFlavoursByBrandId(brandId);
    }

    @PostMapping("/brands/{brandId}/publish")
    public ResponseEntity<Brand> publishBrand(@PathVariable Integer brandId) {
        return beerRepository.publishBrand(brandId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/brands/flavours/{beerFlavourId}/publish")
    public ResponseEntity<BeerFlavour> publishBeerFlavour(@PathVariable Integer beerFlavourId) {
        return beerRepository.publishBeerFlavour(beerFlavourId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}

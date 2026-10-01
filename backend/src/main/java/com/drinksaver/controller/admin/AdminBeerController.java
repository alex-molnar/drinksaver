package com.drinksaver.controller.admin;

import com.drinksaver.model.db.BeerFlavour;
import com.drinksaver.model.db.Brand;
import com.drinksaver.model.db.ConsumptionType;
import com.drinksaver.model.dto.patch.UpdateBeerBrand;
import com.drinksaver.model.dto.patch.UpdateBeerFlavour;
import com.drinksaver.model.dto.patch.UpdateConsumptionType;
import com.drinksaver.repository.BeerRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/admin/beer")
public class AdminBeerController {
    private final BeerRepository beerRepository;

    public AdminBeerController(BeerRepository beerRepository) {
        this.beerRepository = beerRepository;
    }

    @PatchMapping("/brands/{brandId}")
    public ResponseEntity<Brand> updateBrand(@PathVariable Integer brandId, @RequestBody UpdateBeerBrand updateBeerBrand) {
        return beerRepository.editBrand(brandId, updateBeerBrand)
            .map(response -> ResponseEntity.ok().body(response))
            .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/brands/flavours/{beerFlavourId}")
    public ResponseEntity<BeerFlavour> updateBeerFlavour(@PathVariable Integer beerFlavourId, @RequestBody UpdateBeerFlavour updateBeerFlavour) {
        return beerRepository.editBeerFlavour(beerFlavourId, updateBeerFlavour)
            .map(response -> ResponseEntity.ok().body(response))
            .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/consumption-types/{consumptionTypeId}")
    public ResponseEntity<ConsumptionType> updateConsumptionType(@PathVariable Integer consumptionTypeId, @RequestBody UpdateConsumptionType updateConsumptionType) {
        return beerRepository.editConsumptionType(consumptionTypeId, updateConsumptionType)
            .map(response -> ResponseEntity.ok().body(response))
            .orElse(ResponseEntity.notFound().build());
    }
}

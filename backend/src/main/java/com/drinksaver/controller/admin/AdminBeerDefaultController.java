package com.drinksaver.controller.admin;

import com.drinksaver.model.db.BeerFlavour;
import com.drinksaver.model.db.Brand;
import com.drinksaver.model.db.ConsumptionType;
import com.drinksaver.model.dto.post.NewBeerBrand;
import com.drinksaver.model.dto.post.NewBeerFlavour;
import com.drinksaver.model.dto.post.NewConsumptionType;
import com.drinksaver.repository.BeerRepository;
import com.drinksaver.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

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
        return  beerRepository.getAdminBeerFlavoursByBrandId(brandId);
    }

    @GetMapping("/consumption-types")
    public List<ConsumptionType> getDefaultBeerConsumptionTypes() {
        return beerRepository.getConsumptionTypes(10);
    }


    @PostMapping("/brands")
    public Brand saveBrand(@Valid @RequestBody NewBeerBrand newBeerBrand) {
        return beerRepository.saveAdminBrand(newBeerBrand.name(), newBeerBrand.flavours(), newBeerBrand.colorPaletteId());
    }

    @PostMapping("/brands/{brandId}/flavours")
    public BeerFlavour saveBrandName(@PathVariable Integer brandId, @Valid @RequestBody NewBeerFlavour newBeerFlavour) {
        return beerRepository.saveAdminBeerFlavour(brandId, newBeerFlavour.name(), newBeerFlavour.colorPaletteId());
    }

    @PostMapping("/consumption-types")
    public ConsumptionType saveConsumptionType(@Valid @RequestBody NewConsumptionType newConsumptionType) {
        return beerRepository.saveAdminConsumptionType(newConsumptionType);
    }
}

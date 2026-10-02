package com.drinksaver.controller.admin;

import com.drinksaver.model.db.AlcoholSubtype;
import com.drinksaver.model.db.AlcoholType;
import com.drinksaver.model.dto.post.NewAlcoholEntry;
import com.drinksaver.model.dto.post.NewAlcoholSubtype;
import com.drinksaver.repository.AlcoholRepository;
import com.drinksaver.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/admin/default/alcohol")
public class AdminAlcoholDefaultController {
    private final AlcoholRepository alcoholRepository;

    public AdminAlcoholDefaultController(AlcoholRepository alcoholRepository) {
        this.alcoholRepository = alcoholRepository;
    }

    @GetMapping("/types")
    public List<AlcoholType> getDefaultAlcoholTypes() {
        return alcoholRepository.getAdminAlcoholTypes();
    }

    @GetMapping("/types/{alcoholTypeId}/subtypes")
    public List<AlcoholSubtype> getDefaultSubtypesByAlcoholType(@PathVariable Integer alcoholTypeId) {
        return alcoholRepository.getAdminSubtypesByAlcoholType(alcoholTypeId);
    }

    @PostMapping("/types")
    public AlcoholType createAlcoholType(@Valid @RequestBody NewAlcoholEntry newAlcoholEntry) {
        return alcoholRepository.createAdminAlcoholType(newAlcoholEntry);
    }

    @PostMapping("/types/{alcoholTypeId}/subtypes")
    public AlcoholSubtype getSubtypesByAlcoholType(@PathVariable Integer alcoholTypeId,  @Valid @RequestBody NewAlcoholSubtype newAlcoholSubtype) {
        return alcoholRepository.saveAdminSubtypeForAlcoholType(alcoholTypeId, newAlcoholSubtype);
    }
}

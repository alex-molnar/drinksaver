package com.drinksaver.controller.admin;

import com.drinksaver.model.db.AlcoholSubtype;
import com.drinksaver.model.db.AlcoholType;
import com.drinksaver.repository.AlcoholRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/admin/user-defined/alcohol")
public class AdminAlcoholUserController {
    private final AlcoholRepository alcoholRepository;

    public AdminAlcoholUserController(AlcoholRepository alcoholRepository) {
        this.alcoholRepository = alcoholRepository;
    }

    @GetMapping("/types")
    public List<AlcoholType> getUserDefinedAlcoholTypes() {
        return alcoholRepository.getUserDefinedAlcoholTypes();
    }

    @GetMapping("/types/{alcoholTypeId}/subtypes")
    public List<AlcoholSubtype> getUserDefinedSubtypesByAlcoholType(@PathVariable Integer alcoholTypeId) {
        return alcoholRepository.getUserDefinedSubtypesByAlcoholType(alcoholTypeId);
    }

    @PostMapping("/types/{alcoholTypeId}/publish")
    public ResponseEntity<AlcoholType> publishAlcoholType(@PathVariable Integer alcoholTypeId) {
        return alcoholRepository.publishAlcoholType(alcoholTypeId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/types/subtypes/{alcoholSubTypeId}/publish")
    public ResponseEntity<AlcoholSubtype> publishAlcoholSubtype(@PathVariable Integer alcoholSubTypeId) {
        return alcoholRepository.publishAlcoholSubtype(alcoholSubTypeId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}

package com.drinksaver.controller.admin;

import com.drinksaver.model.db.AlcoholSubtype;
import com.drinksaver.model.db.AlcoholType;
import com.drinksaver.repository.AlcoholRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    //TODO Volumes + PATCH/POST
}

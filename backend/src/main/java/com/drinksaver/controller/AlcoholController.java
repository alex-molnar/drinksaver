package com.drinksaver.controller;

import com.drinksaver.model.db.AlcoholSubtype;
import com.drinksaver.model.db.AlcoholType;
import com.drinksaver.model.db.AlcoholVolume;
import com.drinksaver.model.dto.NewAlcoholEntry;
import com.drinksaver.model.dto.NewAlcoholSubtype;
import com.drinksaver.model.dto.NewVolumeEntry;
import com.drinksaver.repository.AlcoholRepository;
import com.drinksaver.service.InjectorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/alcohol")
public class AlcoholController {

    private final AlcoholRepository alcoholRepository;

    @Autowired
    public AlcoholController(InjectorService injectorService) {
        this.alcoholRepository = injectorService.getAlcoholRepository();
    }

    @GetMapping("/types")
    public List<AlcoholType> getAlcoholTypes(@RequestParam(defaultValue = "10") UUID userId) {
        return alcoholRepository.getAlcoholTypes(userId);
    }

    @GetMapping("/types/{alcoholTypeId}/subtypes")
    public List<AlcoholSubtype> getSubtypesByAlcoholType(@PathVariable Integer alcoholTypeId, @RequestParam UUID userId) {
        return alcoholRepository.getSubtypesByAlcoholType(alcoholTypeId, userId);
    }

    @PostMapping("/types/{alcoholTypeId}/subtypes")
    public AlcoholSubtype getSubtypesByAlcoholType(@PathVariable Integer alcoholTypeId, @RequestBody NewAlcoholSubtype newAlcoholSubtype) {
        return alcoholRepository.saveSubtypeForAlcoholType(alcoholTypeId, newAlcoholSubtype);
    }

    @GetMapping("/types/{alcoholTypeId}/volumes")
    public List<AlcoholVolume> getVolumesByAlcoholType(@PathVariable Integer alcoholTypeId) {
        return alcoholRepository.getVolumesByAlcoholType(alcoholTypeId);
    }

    @PostMapping("/types/{alcoholTypeId}/volumes")
    public AlcoholVolume saveVolumeForAlcoholType(
            @PathVariable Integer alcoholTypeId,
            @RequestBody NewVolumeEntry volumeDescription) {
        return alcoholRepository.saveVolumeForAlcoholType(
                alcoholTypeId,
                volumeDescription
        );
    }

    @PostMapping("/types")
    public AlcoholType createAlcoholType(@RequestBody NewAlcoholEntry newAlcoholEntry) {
        return alcoholRepository.createAlcoholType(newAlcoholEntry);
    }

}

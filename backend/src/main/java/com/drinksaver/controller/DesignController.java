package com.drinksaver.controller;

import com.drinksaver.model.db.ColorPalette;
import com.drinksaver.model.db.Glassware;
import com.drinksaver.repository.DesignRepository;
import com.drinksaver.service.InjectorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/v1/design")
public class DesignController {
    private DesignRepository designRepository;

    @Autowired
    public DesignController(InjectorService injectorService) {
        this.designRepository = injectorService.getDesignRepository();
    }

    @GetMapping("/color-palettes")
    public List<ColorPalette> getAvailableColorPalette() {
        return designRepository.getAvailableColorPalettes();
    }

    @GetMapping("/glassware")
    public List<Glassware> getAvailableGlasswareIcons() {
        return designRepository.getAvailableGlasswareIcons();
    }
}

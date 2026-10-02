package com.drinksaver.controller.user;

import com.drinksaver.model.db.ColorPalette;
import com.drinksaver.model.db.Glassware;
import com.drinksaver.service.DesignService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/v1/design")
public class DesignController {
    private final DesignService designService;

    @Autowired
    public DesignController(DesignService designService) {
        this.designService = designService;
    }

    @GetMapping("/color-palettes")
    public List<ColorPalette> getAvailableColorPalette() {
        return designService.getAvailableColorPalettes();
    }

    @GetMapping("/glassware")
    public List<Glassware> getAvailableGlasswareIcons() {
        return designService.getAvailableGlasswareIcons();
    }
}

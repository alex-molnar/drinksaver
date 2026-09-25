package com.drinksaver.controller.admin;

import com.drinksaver.model.db.ColorPalette;
import com.drinksaver.model.db.Glassware;
import com.drinksaver.model.dto.NewColorPalette;
import com.drinksaver.model.dto.NewGlassware;
import com.drinksaver.model.dto.UpdateColorPalette;
import com.drinksaver.model.dto.UpdateGlassware;
import com.drinksaver.repository.DesignRepository;
import com.drinksaver.service.DesignUsageService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/admin/design")
public class AdminDesignController {
    private final DesignRepository designRepository;
    private final DesignUsageService designUsageService;

    @Autowired
    public AdminDesignController(DesignRepository designRepository, DesignUsageService designUsageService) {
        this.designRepository = designRepository;
        this.designUsageService = designUsageService;
    }

    @GetMapping("/color-palettes")
    public List<ColorPalette> getAvailableColorPalette() {
        return designRepository.getAvailableColorPalettes();
    }

    @PostMapping("/color-palette")
    public ColorPalette addColorPalette(@Valid @RequestBody NewColorPalette colorPalette) {
        return designRepository.saveColorPalette(colorPalette);
    }

    @PatchMapping("/color-palette/{id}")
    public ResponseEntity<ColorPalette> updateColorPalette(@PathVariable Integer id, @RequestBody UpdateColorPalette updateColorPalette) {
        return designRepository.updateColorPalette(id, updateColorPalette)
            .map(updatedColorPalette -> ResponseEntity.ok().body(updatedColorPalette))
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/color-palette/{id}")
    public ResponseEntity<Void> deleteColorPalette(@PathVariable Integer id) {
        return designUsageService.countColorPaletteIdUsage(id) > 0
            ? ResponseEntity.status(409).build()
            : designRepository.deleteColorPalette(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    @GetMapping("/glassware")
    public List<Glassware> getAvailableGlasswareIcons() {
        return designRepository.getAvailableGlasswareIcons();
    }

    @PostMapping("/glassware")
    public Glassware addGlassware(@Valid @RequestBody NewGlassware glassware) {
        return designRepository.saveGlassware(glassware);
    }

    @PatchMapping("/glassware/{id}")
    public ResponseEntity<Glassware> updateGlassware(@PathVariable Integer id, @RequestBody UpdateGlassware updateGlassware) {
        return designRepository.updateGlassware(id, updateGlassware)
                .map(updatedGlassware -> ResponseEntity.ok().body(updatedGlassware))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/glassware/{id}")
    public ResponseEntity<Void> deleteGlassware(@PathVariable Integer id) {
        return designUsageService.countGlasswareIdUsage(id) > 0
            ? ResponseEntity.status(409).build()
            : designRepository.deleteGlassware(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}

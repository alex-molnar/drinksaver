package com.drinksaver.controller.admin;

import com.drinksaver.model.db.ColorPalette;
import com.drinksaver.model.db.Glassware;
import com.drinksaver.model.dto.NewColorPalette;
import com.drinksaver.model.dto.NewGlassware;
import com.drinksaver.model.dto.UpdateColorPalette;
import com.drinksaver.model.dto.UpdateGlassware;
import com.drinksaver.service.DesignService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/admin/design")
public class AdminDesignController {
    private final DesignService designService;

    @Autowired
    public AdminDesignController(DesignService designService) {
        this.designService = designService;
    }

    @GetMapping("/color-palettes")
    public List<ColorPalette> getAvailableColorPalette() {
        return designService.getAvailableColorPalettes();
    }

    @PostMapping("/color-palette")
    public ColorPalette addColorPalette(@Valid @RequestBody NewColorPalette colorPalette) {
        return designService.saveColorPalette(colorPalette);
    }

    @PatchMapping("/color-palette/{id}")
    public ResponseEntity<ColorPalette> updateColorPalette(@PathVariable Integer id, @RequestBody UpdateColorPalette updateColorPalette) {
        return designService.updateColorPalette(id, updateColorPalette)
            .map(updatedColorPalette -> ResponseEntity.ok().body(updatedColorPalette))
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/color-palette/{id}")
    public ResponseEntity<Void> deleteColorPalette(@PathVariable Integer id) {
        return ResponseEntity.status(designService.deleteColorPalette(id)).build();
    }

    @GetMapping("/glassware")
    public List<Glassware> getAvailableGlasswareIcons() {
        return designService.getAvailableGlasswareIcons();
    }

    @PostMapping("/glassware")
    public Glassware addGlassware(@Valid @RequestBody NewGlassware glassware) {
        return designService.saveGlassware(glassware);
    }

    @PatchMapping("/glassware/{id}")
    public ResponseEntity<Glassware> updateGlassware(@PathVariable Integer id, @RequestBody UpdateGlassware updateGlassware) {
        return designService.updateGlassware(id, updateGlassware)
                .map(updatedGlassware -> ResponseEntity.ok().body(updatedGlassware))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/glassware/{id}")
    public ResponseEntity<Void> deleteGlassware(@PathVariable Integer id) {
        return ResponseEntity.status(designService.deleteGlassware(id)).build();
    }
}

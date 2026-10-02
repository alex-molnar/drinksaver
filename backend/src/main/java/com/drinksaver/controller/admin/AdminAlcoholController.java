package com.drinksaver.controller.admin;


import com.drinksaver.model.db.AlcoholSubtype;
import com.drinksaver.model.db.AlcoholType;
import com.drinksaver.model.dto.patch.UpdateAlcoholSubtype;
import com.drinksaver.model.dto.patch.UpdateAlcoholType;
import com.drinksaver.repository.AlcoholRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/admin/alcohol")
public class AdminAlcoholController {
    private final AlcoholRepository alcoholRepository;

    public AdminAlcoholController(AlcoholRepository alcoholRepository) {
        this.alcoholRepository = alcoholRepository;
    }

    @PatchMapping("/types/{id}")
    public ResponseEntity<AlcoholType> patchAlcoholType(@PathVariable Integer id, @Valid @RequestBody UpdateAlcoholType updateAlcoholType) {
        return alcoholRepository.editAlcoholType(id, updateAlcoholType)
                .map(response -> ResponseEntity.ok().body(response))
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/subtypes/{id}")
    public ResponseEntity<AlcoholSubtype> patchAlcoholSubtypeType(@PathVariable Long id, @Valid @RequestBody UpdateAlcoholSubtype updateAlcoholSubtype) {
        return alcoholRepository.editAlcoholSubtype(id, updateAlcoholSubtype)
                .map(response -> ResponseEntity.ok().body(response))
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/types/{id}")
    public ResponseEntity<Void> deleteAlcoholType(@PathVariable Integer id) {
        return ResponseEntity.status(alcoholRepository.deleteAlcoholType(id)).build();
    }

    @DeleteMapping("/subtypes/{id}")
    public ResponseEntity<Void> deleteAlcoholSubtypeType(@PathVariable Long id) {
        return ResponseEntity.status(alcoholRepository.deleteAlcoholSubType(id)).build();
    }
}

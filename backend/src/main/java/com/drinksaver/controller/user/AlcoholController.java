package com.drinksaver.controller.user;

import com.drinksaver.model.db.AlcoholSubtype;
import com.drinksaver.model.db.AlcoholType;
import com.drinksaver.model.db.AlcoholVolume;
import com.drinksaver.model.dto.post.NewAlcoholEntry;
import com.drinksaver.model.dto.post.NewAlcoholSubtype;
import com.drinksaver.model.dto.post.NewVolumeEntry;
import com.drinksaver.repository.AlcoholRepository;
import com.drinksaver.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/v1/alcohol")
public class AlcoholController {

    private final AlcoholRepository alcoholRepository;

    @Autowired
    public AlcoholController(AlcoholRepository alcoholRepository) {
        this.alcoholRepository = alcoholRepository;
    }

    @GetMapping("/types")
    public List<AlcoholType> getAlcoholTypes(@AuthenticationPrincipal Jwt jwt) {
        return alcoholRepository.getAlcoholTypes(AuthenticatedUser.id(jwt));
    }

    @GetMapping("/types/{alcoholTypeId}/subtypes")
    public List<AlcoholSubtype> getSubtypesByAlcoholType(@AuthenticationPrincipal Jwt jwt, @PathVariable Integer alcoholTypeId) {
        return alcoholRepository.getSubtypesByAlcoholType(alcoholTypeId, AuthenticatedUser.id(jwt));
    }

    @PostMapping("/types/{alcoholTypeId}/subtypes")
    public AlcoholSubtype getSubtypesByAlcoholType(@AuthenticationPrincipal Jwt jwt, @PathVariable Integer alcoholTypeId,  @Valid @RequestBody NewAlcoholSubtype newAlcoholSubtype) {
        return alcoholRepository.saveSubtypeForAlcoholType(alcoholTypeId, newAlcoholSubtype.withUserId(AuthenticatedUser.id(jwt)));
    }

    @GetMapping("/types/{alcoholTypeId}/volumes")
    public List<AlcoholVolume> getVolumesByAlcoholType(@PathVariable Integer alcoholTypeId) {
        // Alcohol types and their volume vocabulary are readable throughout the shared catalogue.
        return alcoholRepository.getVolumesByAlcoholType(alcoholTypeId);
    }

    @PostMapping("/types/{alcoholTypeId}/volumes")
    public ResponseEntity<AlcoholVolume> saveVolumeForAlcoholType(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Integer alcoholTypeId,
            @Valid @RequestBody NewVolumeEntry volumeDescription) {
        try {
            return alcoholRepository
                    .saveVolumeForAlcoholType(alcoholTypeId, AuthenticatedUser.id(jwt), volumeDescription)
                    .map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.notFound().build());
        } catch (OptimisticLockingFailureException exception) {
            return ResponseEntity.status(409).build();
        }
    }

    @PostMapping("/types")
    public AlcoholType createAlcoholType(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody NewAlcoholEntry newAlcoholEntry) {
        return alcoholRepository.createAlcoholType(newAlcoholEntry.withUserId(AuthenticatedUser.id(jwt)));
    }

}

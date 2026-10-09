package com.drinksaver.model.db;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.drinksaver.model.dto.patch.UpdateAlcoholType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "alcohol_types")
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class AlcoholType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    /** Non-null and defaulted in DDL so existing rows get version zero during schema update. */
    @JsonIgnore
    @Version
    @Column(nullable = false, columnDefinition = "integer default 0")
    private int version;

    private UUID userId;
    private String name;
    private List<Integer> volumeIds;
    private Integer colorPaletteId;
    private Integer glasswareId;

    public AlcoholType(UUID userId, String name, List<Integer> volumeIds, Integer colorPaletteId, Integer glasswareId) {
        this.userId = userId;
        this.name = name;
        this.volumeIds = volumeIds;
        this.colorPaletteId = colorPaletteId;
        this.glasswareId = glasswareId;
    }

    public AlcoholType withUpdates(UpdateAlcoholType updateAlcoholType) {
        if (updateAlcoholType.name() != null) {
            this.name = updateAlcoholType.name();
        }
        if (updateAlcoholType.volumeIds() != null) {
            this.volumeIds = updateAlcoholType.volumeIds();
        }
        if (updateAlcoholType.colorPaletteId() != null) {
            this.colorPaletteId = updateAlcoholType.colorPaletteId();
        }
        if (updateAlcoholType.glasswareId() != null) {
            this.glasswareId = updateAlcoholType.glasswareId();
        }
        return this;
    }

    public AlcoholType withUserId(UUID userId) {
        this.userId = userId;
        return this;
    }
}

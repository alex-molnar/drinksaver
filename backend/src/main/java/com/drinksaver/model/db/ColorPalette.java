package com.drinksaver.model.db;

import com.drinksaver.model.dto.NewColorPalette;
import com.drinksaver.model.dto.UpdateColorPalette;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "color_palettes")
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class ColorPalette {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;
    private String field;
    private String inkLight;
    private String inkDark;

    public ColorPalette(String name, String field, String inkLight, String inkDark) {
        this.name = name;
        this.field = field;
        this.inkLight = inkLight;
        this.inkDark = inkDark;
    }

    public ColorPalette withOptionalUpdate(UpdateColorPalette updateColorPalette) {
        this.name = updateColorPalette.name();
        this.field = updateColorPalette.field();
        this.inkLight = updateColorPalette.inkLight();
        this.inkDark = updateColorPalette.inkDark();
        return this;
    }
}

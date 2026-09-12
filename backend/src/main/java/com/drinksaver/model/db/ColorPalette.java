package com.drinksaver.model.db;

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
}

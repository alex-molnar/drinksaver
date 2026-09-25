package com.drinksaver.model.db;

import com.drinksaver.model.dto.UpdateGlassware;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "glassware")
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class Glassware {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;
    @Column(columnDefinition = "TEXT")
    private String g;
    @Column(columnDefinition = "TEXT")
    private String l;
    @Column(columnDefinition = "TEXT")
    private String f;

    public Glassware(String name, String g, String l, String f) {
        this.name = name;
        this.g = g;
        this.l = l;
        this.f = f;
    }

    public Glassware withOptionalUpdate(UpdateGlassware updateGlassware) {
        this.name = updateGlassware.name();
        this.g = updateGlassware.g();
        this.l = updateGlassware.l();
        this.f = updateGlassware.f();
        return this;
    }
}

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
        if (updateGlassware.name() != null) {
            this.name = updateGlassware.name();
        }
        if (updateGlassware.g() != null) {
            this.g = updateGlassware.g();
        }
        if (updateGlassware.l() != null) {
            this.l = updateGlassware.l();
        }
        if (updateGlassware.f() != null && updateGlassware.f().isEmpty()) {
            this.f = null;
        } else if (updateGlassware.f() != null) {
            this.f = updateGlassware.f();
        }
        return this;
    }
}

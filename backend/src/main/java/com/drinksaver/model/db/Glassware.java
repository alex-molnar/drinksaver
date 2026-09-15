package com.drinksaver.model.db;

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
}

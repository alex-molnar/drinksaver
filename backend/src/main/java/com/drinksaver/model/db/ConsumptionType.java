package com.drinksaver.model.db;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "consumption_types")
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class ConsumptionType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;

    public ConsumptionType(String name) {
        this.name = name;
    }
}
package com.drinksaver.model.db;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "beer_flavours")
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class BeerFlavour {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private Integer brandId;
    private UUID userId;
    private String name;

    public BeerFlavour(Integer brandId, UUID userId, String name) {
        this.brandId = brandId;
        this.userId = userId;
        this.name = name;
    }
}

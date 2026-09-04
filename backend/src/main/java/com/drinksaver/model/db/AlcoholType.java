package com.drinksaver.model.db;

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

    private UUID userId;
    private String name;
    private List<Integer> volumeIds;

    public AlcoholType(UUID userId, String name, List<Integer> volumeIds) {
        this.userId = userId;
        this.name = name;
        this.volumeIds = volumeIds;
    }
}

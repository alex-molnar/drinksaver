package com.drinksaver.model.db;

import com.drinksaver.model.dto.patch.UpdateConsumptionType;
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
    private Integer glasswareId;

    public ConsumptionType(String name, Integer glasswareId) {
        this.name = name;
        this.glasswareId = glasswareId;
    }

    public ConsumptionType withUpdate(UpdateConsumptionType updateConsumptionType) {
        if (updateConsumptionType.name() != null) {
            this.name = updateConsumptionType.name();
        }
        if (updateConsumptionType.glasswareId() != null) {
            this.glasswareId = updateConsumptionType.glasswareId();
        }
        return this;
    }
}
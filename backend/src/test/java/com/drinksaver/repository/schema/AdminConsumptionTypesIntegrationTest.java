package com.drinksaver.repository.schema;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.controller.admin.AdminBeerDefaultController;
import com.drinksaver.model.db.ConsumptionType;
import com.drinksaver.repository.BeerRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

@Import({BeerRepository.class, AdminBeerDefaultController.class})
class AdminConsumptionTypesIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private ConsumptionTypesTable consumptionTypesTable;

    @Autowired
    private AdminBeerDefaultController controller;

    @MockitoBean
    private RepositoryConfiguration repositoryConfiguration;

    @Test
    void adminCollectionReturnsAllConsumptionTypesBeyondTheConsumerLimit() {
        consumptionTypesTable.saveAll(IntStream.rangeClosed(1, 11)
                .mapToObj(index -> new ConsumptionType("Type %02d".formatted(index), null))
                .toList());
        consumptionTypesTable.flush();

        assertThat(controller.getDefaultBeerConsumptionTypes())
                .extracting(ConsumptionType::getName)
                .containsExactly("Type 01", "Type 02", "Type 03", "Type 04", "Type 05", "Type 06",
                        "Type 07", "Type 08", "Type 09", "Type 10", "Type 11");
    }
}

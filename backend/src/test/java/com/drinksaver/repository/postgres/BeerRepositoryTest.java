package com.drinksaver.repository.postgres;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.repository.BeerRepository;
import com.drinksaver.repository.schema.BeerFlavoursTable;
import com.drinksaver.repository.schema.BrandsTable;
import com.drinksaver.repository.schema.ConsumptionTypesTable;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BeerRepositoryTest {

    private static final UUID ADMIN = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID USER = UUID.fromString("00000000-0000-0000-0000-000000000002");
    private static final RepositoryConfiguration CONFIG = new RepositoryConfiguration(
                "postgres", "postgres", "postgres", "postgres", "postgres",
                ADMIN, 4, 10, 0.97
    );

    private BeerRepository repositoryWith(BrandsTable brands) {
        return new BeerRepository(
                brands,
                mock(ConsumptionTypesTable.class),
                mock(BeerFlavoursTable.class),
                CONFIG
        );
    }

    private Collection<UUID> capturedUserIds(BrandsTable brands) {
        ArgumentCaptor<Collection<UUID>> captor = ArgumentCaptor.captor();
        verify(brands).findAllByUserIdInOrderByName(captor.capture());
        return captor.getValue();
    }

    @Test
    void getBrandsQueriesForBothTheAdminsAndTheCaller() {
        BrandsTable brands = mock(BrandsTable.class);
        when(brands.findAllByUserIdInOrderByName(anyCollection())).thenReturn(List.of());

        repositoryWith(brands).getBrands(USER);

        assertThat(capturedUserIds(brands)).containsExactlyInAnyOrder(ADMIN, USER);
    }

    /**
     * getBeerFlavours repeats the same admin-plus-caller visibility rule as
     * getBrands. It decides whose data a caller can see, so the duplicate is
     * worth pinning independently rather than trusting the two to stay in step.
     */
    @Test
    void getBeerFlavoursQueriesForBothTheAdminsAndTheCaller() {
        BeerFlavoursTable flavours = mock(BeerFlavoursTable.class);
        when(flavours.findAllByBrandIdAndUserIdIn(eq(7), anyList())).thenReturn(List.of());

        new BeerRepository(
                mock(BrandsTable.class),
                mock(ConsumptionTypesTable.class),
                flavours,
                CONFIG
        ).getBeerFlavours(7, USER);

        ArgumentCaptor<List<UUID>> captor = ArgumentCaptor.captor();
        verify(flavours).findAllByBrandIdAndUserIdIn(eq(7), captor.capture());

        assertThat(captor.getValue()).containsExactlyInAnyOrder(ADMIN, USER);
    }
}

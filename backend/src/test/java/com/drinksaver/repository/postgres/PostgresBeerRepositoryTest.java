package com.drinksaver.repository.postgres;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.repository.postgres.schema.BeerFlavoursTable;
import com.drinksaver.repository.postgres.schema.BrandsTable;
import com.drinksaver.repository.postgres.schema.ConsumptionTypesTable;
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

class PostgresBeerRepositoryTest {

    private static final UUID ADMIN = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID USER = UUID.fromString("00000000-0000-0000-0000-000000000002");

    private RepositoryConfiguration configWithAdmins(List<UUID> admins) {
        return new RepositoryConfiguration(
                "postgres", "postgres", "postgres", "postgres",
                admins, 4, 10, 0.97
        );
    }

    private PostgresBeerRepository repositoryWith(BrandsTable brands, List<UUID> admins) {
        return new PostgresBeerRepository(
                brands,
                mock(ConsumptionTypesTable.class),
                mock(BeerFlavoursTable.class),
                configWithAdmins(admins)
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

        repositoryWith(brands, List.of(ADMIN)).getBrands(USER);

        assertThat(capturedUserIds(brands)).containsExactly(ADMIN, USER);
    }

    @Test
    void getBrandsStillIncludesTheCallerWhenThereAreNoAdmins() {
        BrandsTable brands = mock(BrandsTable.class);
        when(brands.findAllByUserIdInOrderByName(anyCollection())).thenReturn(List.of());

        repositoryWith(brands, List.of()).getBrands(USER);

        assertThat(capturedUserIds(brands)).containsExactly(USER);
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

        new PostgresBeerRepository(
                mock(BrandsTable.class),
                mock(ConsumptionTypesTable.class),
                flavours,
                configWithAdmins(List.of(ADMIN))
        ).getBeerFlavours(7, USER);

        ArgumentCaptor<List<UUID>> captor = ArgumentCaptor.captor();
        verify(flavours).findAllByBrandIdAndUserIdIn(eq(7), captor.capture());

        assertThat(captor.getValue()).containsExactly(ADMIN, USER);
    }

    @Test
    void isMatchesOnlyThePostgresRepositoryType() {
        PostgresBeerRepository repository = repositoryWith(mock(BrandsTable.class), List.of(ADMIN));

        assertThat(repository.is("postgres")).isTrue();
        assertThat(repository.is("hardcoded")).isFalse();
    }
}

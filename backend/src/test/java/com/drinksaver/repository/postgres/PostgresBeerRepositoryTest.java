package com.drinksaver.repository.postgres;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.Brand;
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

    @SuppressWarnings("unchecked")
    private Collection<UUID> capturedUserIds(BrandsTable brands) {
        ArgumentCaptor<Collection<UUID>> captor = ArgumentCaptor.forClass(Collection.class);
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

    @Test
    void getBrandsReturnsWhateverTheTableReturns() {
        BrandsTable brands = mock(BrandsTable.class);
        Brand brand = new Brand(USER, "Guinness");
        when(brands.findAllByUserIdInOrderByName(anyCollection())).thenReturn(List.of(brand));

        assertThat(repositoryWith(brands, List.of(ADMIN)).getBrands(USER)).containsExactly(brand);
    }

    @Test
    void isMatchesOnlyThePostgresRepositoryType() {
        PostgresBeerRepository repository = repositoryWith(mock(BrandsTable.class), List.of(ADMIN));

        assertThat(repository.is("postgres")).isTrue();
        assertThat(repository.is("hardcoded")).isFalse();
    }
}

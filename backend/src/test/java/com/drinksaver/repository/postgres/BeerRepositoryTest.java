package com.drinksaver.repository.postgres;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.BeerFlavour;
import com.drinksaver.model.db.Brand;
import com.drinksaver.model.db.ConsumptionType;
import com.drinksaver.model.dto.patch.UpdateBeerBrand;
import com.drinksaver.model.dto.patch.UpdateBeerFlavour;
import com.drinksaver.model.dto.patch.UpdateConsumptionType;
import com.drinksaver.repository.BeerRepository;
import com.drinksaver.repository.schema.BeerFlavoursTable;
import com.drinksaver.repository.schema.BrandsTable;
import com.drinksaver.repository.schema.ConsumptionTypesTable;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.any;
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

    @Test
    void editsAndPublishesBrands() {
        BrandsTable brands = mock(BrandsTable.class);
        Brand existing = new Brand(USER, "Old", 1);
        when(brands.findById(1)).thenReturn(Optional.of(existing));
        when(brands.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        BeerRepository repository = new BeerRepository(brands, mock(ConsumptionTypesTable.class), mock(BeerFlavoursTable.class), CONFIG);

        assertThat(repository.editBrand(1, new UpdateBeerBrand("New", 2))).contains(existing);
        assertThat(existing.getName()).isEqualTo("New");
        assertThat(existing.getColorPaletteId()).isEqualTo(2);
        assertThat(repository.publishBrand(1)).contains(existing);
        assertThat(existing.getUserId()).isEqualTo(ADMIN);
    }

    @Test
    void editsAndPublishesBeerFlavours() {
        BeerFlavoursTable flavours = mock(BeerFlavoursTable.class);
        BeerFlavour existing = new BeerFlavour(1, USER, "Old", 1);
        when(flavours.findById(1)).thenReturn(Optional.of(existing));
        when(flavours.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        BeerRepository repository = new BeerRepository(mock(BrandsTable.class), mock(ConsumptionTypesTable.class), flavours, CONFIG);

        assertThat(repository.editBeerFlavour(1, new UpdateBeerFlavour("New", 2))).contains(existing);
        assertThat(existing.getName()).isEqualTo("New");
        assertThat(existing.getColorPaletteId()).isEqualTo(2);
        assertThat(repository.publishBeerFlavour(1)).contains(existing);
        assertThat(existing.getUserId()).isEqualTo(ADMIN);
    }

    @Test
    void editsConsumptionType() {
        ConsumptionTypesTable consumptionTypes = mock(ConsumptionTypesTable.class);
        ConsumptionType existing = new ConsumptionType(1, "Old", 2);
        when(consumptionTypes.findById(1)).thenReturn(Optional.of(existing));
        when(consumptionTypes.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        BeerRepository repository = new BeerRepository(mock(BrandsTable.class), consumptionTypes, mock(BeerFlavoursTable.class), CONFIG);

        assertThat(repository.editConsumptionType(1, new UpdateConsumptionType("New", 3))).contains(existing);
        assertThat(existing.getName()).isEqualTo("New");
        assertThat(existing.getGlasswareId()).isEqualTo(3);
    }
}

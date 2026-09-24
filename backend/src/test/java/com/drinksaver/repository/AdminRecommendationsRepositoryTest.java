package com.drinksaver.repository;

import com.drinksaver.model.db.admin.DefaultRecommendation;
import com.drinksaver.model.dto.NewDefaultRecommendation;
import com.drinksaver.model.dto.RecommendationUpdate;
import com.drinksaver.repository.schema.admin.DefaultRecommendationsTable;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminRecommendationsRepositoryTest {

    private static final NewDefaultRecommendation NEW =
            new NewDefaultRecommendation("Heineken", 4, null, 2, 3, null, 1, 3, 1);

    @Mock
    private DefaultRecommendationsTable defaultRecommendationsTable;

    @InjectMocks
    private AdminRecommendationsRepository adminRecommendationsRepository;

    @Test
    void firstRecommendationGetsOrderNumberOne() {
        when(defaultRecommendationsTable.getLargestOrderNumber()).thenReturn(null);

        assertThat(savedFrom(NEW).getOrderNumber()).isEqualTo(1);
    }

    @Test
    void newRecommendationGoesAfterTheLastOne() {
        when(defaultRecommendationsTable.getLargestOrderNumber()).thenReturn(3);

        DefaultRecommendation saved = savedFrom(NEW);

        assertThat(saved.getOrderNumber()).isEqualTo(4);
        assertThat(saved.getName()).isEqualTo("Heineken");
        assertThat(saved.getColorPaletteId()).isEqualTo(3);
        assertThat(saved.getGlasswareId()).isEqualTo(1);
    }

    @Test
    void deletingAMissingRecommendationReportsFalseAndDeletesNothing() {
        when(defaultRecommendationsTable.existsById(9)).thenReturn(false);

        assertThat(adminRecommendationsRepository.deleteRecommendation(9)).isFalse();
        verify(defaultRecommendationsTable, never()).deleteById(any());
    }

    @Test
    void deletingAnExistingRecommendationReportsTrue() {
        when(defaultRecommendationsTable.existsById(9)).thenReturn(true);

        assertThat(adminRecommendationsRepository.deleteRecommendation(9)).isTrue();
        verify(defaultRecommendationsTable).deleteById(9);
    }

    @Test
    void updatePassesIdsAndNamesInRequestOrderAndReturnsTheSortedList() {
        List<DefaultRecommendation> sorted = List.of(new DefaultRecommendation());
        when(defaultRecommendationsTable.findAllByOrderByOrderNumberAsc()).thenReturn(sorted);

        List<DefaultRecommendation> result = adminRecommendationsRepository.updateRecommendations(List.of(
                new RecommendationUpdate(5, "Five"), new RecommendationUpdate(2, "Two")));

        verify(defaultRecommendationsTable).updateDefaultRecommendationsOrderArray(
                new Integer[]{5, 2}, new String[]{"Five", "Two"});
        assertThat(result).isSameAs(sorted);
    }

    private DefaultRecommendation savedFrom(NewDefaultRecommendation request) {
        when(defaultRecommendationsTable.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        adminRecommendationsRepository.addRecommendation(request);
        ArgumentCaptor<DefaultRecommendation> captor = ArgumentCaptor.forClass(DefaultRecommendation.class);
        verify(defaultRecommendationsTable).save(captor.capture());
        return captor.getValue();
    }
}

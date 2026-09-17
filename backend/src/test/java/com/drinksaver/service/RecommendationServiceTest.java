package com.drinksaver.service;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.Recommendation;
import com.drinksaver.model.dto.RecommendationUpdate;
import com.drinksaver.repository.postgres.schema.RecommendationsTable;
import com.drinksaver.service.recommendations.api.RecommendationSource;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RecommendationServiceTest {

    private static final UUID USER = UUID.randomUUID();

    @Test
    void retainsTheNamedPersistentRecommendationWhenADynamicDuplicateFollows() {
        Recommendation namedPersistent = recommendation("Heineken pint", 4);
        Recommendation namelessDynamicDuplicate = recommendation(null, 4);

        List<Recommendation> result = serviceWith(10, sources(
                source(0, List.of(namedPersistent)),
                source(1, List.of(namelessDynamicDuplicate))
        )).getRecommendations(USER);

        assertThat(result).containsExactly(namedPersistent);
    }

    @Test
    void processesSourcesInTheirDeclaredOrder() {
        Recommendation persistent = recommendation("Persistent", 1);
        Recommendation dynamic = recommendation("Dynamic", 2);
        Recommendation defaultRecommendation = recommendation("Default", 3);

        List<Recommendation> result = serviceWith(10, sources(
                source(2, List.of(defaultRecommendation)),
                source(0, List.of(persistent)),
                source(1, List.of(dynamic))
        )).getRecommendations(USER);

        assertThat(result).containsExactly(persistent, dynamic, defaultRecommendation);
    }

    @Test
    void stopsAfterTheMaximumNumberOfRecommendations() {
        Recommendation first = recommendation("First", 1);
        Recommendation second = recommendation("Second", 2);
        Recommendation later = recommendation("Later", 3);

        List<Recommendation> result = serviceWith(2, sources(
                source(0, List.of(first, second)),
                source(1, List.of(later))
        )).getRecommendations(USER);

        assertThat(result).containsExactly(first, second);
    }

    @Test
    void canBuildRecommendationsAgainAfterTheCacheIsInvalidated() {
        Recommendation persistent = recommendation("Persistent", 1);
        Recommendation dynamic = recommendation("Dynamic", 2);
        RecommendationService service = serviceWith(10, sources(
                source(0, List.of(persistent)),
                source(1, List.of(dynamic))
        ));

        assertThat(service.getRecommendations(USER)).containsExactly(persistent, dynamic);
        assertThat(service.getRecommendations(USER)).containsExactly(persistent, dynamic);
    }

    @Test
    void updateRecommendationsOrderForwardsIdsAndNamesInInputOrder() {
        RecommendationsTable recommendationsTable = mock(RecommendationsTable.class);
        RecommendationService service = serviceWith(10, Map.of(), recommendationsTable);

        List<Recommendation> result = service.updateRecommendationsOrder(USER, List.of(
                new RecommendationUpdate(25, "First name"),
                new RecommendationUpdate(27, "Second name")
        ));

        assertThat(result).isEmpty();
        verify(recommendationsTable).updateRecommendationsOrderArray(
                new Integer[]{25, 27},
                new String[]{"First name", "Second name"}
        );
    }

    @Test
    void updateRecommendationsOrderWithNoUpdatesDoesNotCallRepository() {
        RecommendationsTable recommendationsTable = mock(RecommendationsTable.class);
        RecommendationService service = serviceWith(10, Map.of(), recommendationsTable);

        assertThat(service.updateRecommendationsOrder(USER, List.of())).isEmpty();

        verify(recommendationsTable, org.mockito.Mockito.never())
                .updateRecommendationsOrderArray(any(Integer[].class), any(String[].class));
    }

    @Test
    void isRecommendationOwnedByUserChecksTheStoredOwner() {
        RecommendationsTable recommendationsTable = mock(RecommendationsTable.class);
        Recommendation recommendation = recommendation("Owned", 1);
        recommendation.setId(25);
        when(recommendationsTable.findById(25)).thenReturn(Optional.of(recommendation));
        RecommendationService service = serviceWith(10, Map.of(), recommendationsTable);

        assertThat(service.isRecommendationOwnedByUser(25, USER)).isTrue();
        assertThat(service.isRecommendationOwnedByUser(25, UUID.randomUUID())).isFalse();
    }

    @Test
    void deleteRecommendationDelegatesToTheRepository() {
        RecommendationsTable recommendationsTable = mock(RecommendationsTable.class);
        RecommendationService service = serviceWith(10, Map.of(), recommendationsTable);

        service.deleteRecommendation(25);

        verify(recommendationsTable).deleteById(25);
    }

    private RecommendationService serviceWith(int maximum, Map<String, RecommendationSource> sources) {
        return serviceWith(maximum, sources, mock(RecommendationsTable.class));
    }

    private RecommendationService serviceWith(
            int maximum,
            Map<String, RecommendationSource> sources,
            RecommendationsTable recommendationsTable
    ) {
        RepositoryConfiguration configuration = new RepositoryConfiguration(
                "postgres", "postgres", "postgres", "postgres", "postgres",
                List.of(UUID.randomUUID()), 4, maximum, 0.97
        );
        return new RecommendationService(configuration, sources, recommendationsTable);
    }

    private Map<String, RecommendationSource> sources(RecommendationSource... sources) {
        Map<String, RecommendationSource> result = new LinkedHashMap<>();
        for (int index = 0; index < sources.length; index++) {
            result.put("source" + index, sources[index]);
        }
        return result;
    }

    private RecommendationSource source(int orderId, List<Recommendation> recommendations) {
        return new RecommendationSource() {
            @Override
            public Stream<Recommendation> buildRecommendation(UUID userId, Stream<Recommendation> processed) {
                return Stream.concat(processed, recommendations.stream()).distinct();
            }

            @Override
            public Integer orderId() {
                return orderId;
            }
        };
    }

    private Recommendation recommendation(String name, int alcoholTypeId) {
        Recommendation recommendation = new Recommendation();
        recommendation.setUserId(USER);
        recommendation.setName(name);
        recommendation.setAlcoholTypeId(alcoholTypeId);
        recommendation.setAlcoholVolumeId(3);
        return recommendation;
    }
}

package com.drinksaver.service;

import com.drinksaver.model.db.Recommendation;
import com.drinksaver.model.db.SavedDrink;
import com.drinksaver.model.dto.post.Drink;
import com.drinksaver.repository.schema.DrinkIdempotencyKeysTable;
import com.drinksaver.repository.schema.RecommendationsTable;
import com.drinksaver.repository.schema.SavedDrinksTable;
import com.drinksaver.service.namecollector.DrinkNameCollector;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.IntStream;

@Repository
public class DrinksService {
    private final DrinkNameCollector drinkNameCollector;
    private final SavedDrinksTable savedDrinksTable;
    private final RecommendationsTable recommendationsTable;
    private final DrinkIdempotencyKeysTable idempotencyKeysTable;
    private final ObjectMapper objectMapper;

    @Autowired
    DrinksService(
        DrinkNameCollector drinkNameCollector,
        SavedDrinksTable savedDrinksTable,
        RecommendationsTable recommendationsTable,
        DrinkIdempotencyKeysTable idempotencyKeysTable
    ) {
        this.drinkNameCollector = drinkNameCollector;
        this.savedDrinksTable = savedDrinksTable;
        this.recommendationsTable = recommendationsTable;
        this.idempotencyKeysTable = idempotencyKeysTable;
        this.objectMapper = new ObjectMapper();
    }

    DrinksService(
        DrinkNameCollector drinkNameCollector,
        SavedDrinksTable savedDrinksTable,
        RecommendationsTable recommendationsTable
    ) {
        this(drinkNameCollector, savedDrinksTable, recommendationsTable, null);
    }

    public boolean is(String repositoryType) {
        return repositoryType.equals("postgres");
    }

    /**
     * Returns every row written, not just the first. A caller that saved N drinks needs all N
     * ids to be able to undo the save; returning getFirst() left N-1 rows unreachable.
     */
    @Transactional
    public List<SavedDrink> saveDrink(Drink drink) {
        return writeDrink(drink);
    }

    /**
     * Atomically claim a per-user request key, write the drinks, and persist the exact
     * response. PostgreSQL's unique constraint serializes concurrent requests with the
     * same key: a retry waits for the first transaction, then reads its committed result.
     */
    @Transactional
    public IdempotentDrinkSave saveDrink(Drink drink, UUID requestKey) {
        Instant now = Instant.now();
        int claimed = idempotencyKeysTable.claim(
            drink.userId(), requestKey, now.plus(Duration.ofHours(1)), now
        );
        if (claimed == 0) {
            String response = idempotencyKeysTable.findResponse(drink.userId(), requestKey)
                .orElseThrow(() -> new IllegalStateException("Idempotency key has no saved response"));
            try {
                return new IdempotentDrinkSave(
                    objectMapper.readValue(response, new TypeReference<List<SavedDrink>>() {}), false
                );
            } catch (JsonProcessingException exception) {
                throw new IllegalStateException("Could not read the saved idempotent response", exception);
            }
        }

        List<SavedDrink> saved = writeDrink(drink);
        try {
            String response = objectMapper.writeValueAsString(saved);
            idempotencyKeysTable.complete(drink.userId(), requestKey, response);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not store the idempotent response", exception);
        }
        return new IdempotentDrinkSave(saved, true);
    }

    private List<SavedDrink> writeDrink(Drink drink) {
        if (drink.shouldAddToRecommendations()) {
            Integer maxOrder = recommendationsTable.findNonTemporaryByUserId(drink.userId()).getFirst();
            recommendationsTable.save(drinkNameCollector.withName(Recommendation.of(drink, maxOrder)));
        }

        return drink.quantity() == null
            ? List.of(savedDrinksTable.save(SavedDrink.of(drink)))
            : savedDrinksTable.saveAll(
                IntStream.range(0, drink.quantity()).mapToObj(i -> SavedDrink.of(drink)).toList()
            );
    }

    /** Keep retry response snapshots for one hour; longer retries are new user actions. */
    @Scheduled(fixedDelay = 900_000)
    @Transactional
    public void removeExpiredIdempotencyKeys() {
        if (idempotencyKeysTable != null) {
            idempotencyKeysTable.deleteExpired(Instant.now());
        }
    }

    public List<SavedDrink> getSavedDrinks(UUID userId, String date) {
        return savedDrinksTable.findByUserIdAndDate(userId, date);
    }

    public List<Integer> ownedDrinkIds(List<Integer> drinkIds, UUID userId) {
        return savedDrinksTable.findAllById(drinkIds).stream()
            // Objects.equals, not .equals: user_id is nullable, so one null row whose id
            // appears in the request would 500 the whole delete. Same defect as the one in
            // DrinksController, which was fixed without checking for siblings.
            .filter(drink -> Objects.equals(drink.getUserId(), userId))
            .map(SavedDrink::getId)
            .toList();
    }

    public int deleteSavedDrink(List<Integer> drinkIds) {
        return savedDrinksTable.deleteAndCountByIds(drinkIds);
    }
}

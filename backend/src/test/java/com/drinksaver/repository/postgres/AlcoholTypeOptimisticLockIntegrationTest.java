package com.drinksaver.repository.postgres;

import com.drinksaver.model.db.AlcoholType;
import com.drinksaver.model.db.AlcoholVolume;
import com.drinksaver.repository.schema.AlcoholTypesTable;
import com.drinksaver.repository.schema.AlcoholVolumeTable;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers(disabledWithoutDocker = true)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class AlcoholTypeOptimisticLockIntegrationTest {

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    @Autowired
    private AlcoholTypesTable alcoholTypesTable;

    @Autowired
    private AlcoholVolumeTable alcoholVolumeTable;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void concurrentAppendsKeepOneReferencedVolumeAndRejectTheStaleWriter() throws Exception {
        TransactionTemplate transactions = new TransactionTemplate(transactionManager);
        Integer typeId = transactions.execute(status -> alcoholTypesTable.saveAndFlush(
            new AlcoholType(UUID.randomUUID(), "Gin", new ArrayList<>(), null, null)
        ).getId());
        long volumeCountBefore = alcoholVolumeTable.count();

        CountDownLatch bothRead = new CountDownLatch(2);
        CountDownLatch writeTogether = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            List<Future<Boolean>> writes = List.of(
                pool.submit(() -> appendVolume(transactions, typeId, "Shot", bothRead, writeTogether)),
                pool.submit(() -> appendVolume(transactions, typeId, "Single", bothRead, writeTogether))
            );
            assertThat(bothRead.await(10, TimeUnit.SECONDS)).isTrue();
            writeTogether.countDown();
            List<Boolean> results = List.of(writes.get(0).get(), writes.get(1).get());

            assertThat(results).containsExactlyInAnyOrder(true, false);
            AlcoholType saved = alcoholTypesTable.findById(typeId).orElseThrow();
            assertThat(saved.getVolumeIds()).hasSize(1);
            assertThat(alcoholVolumeTable.count()).isEqualTo(volumeCountBefore + 1);
        } finally {
            writeTogether.countDown();
            pool.shutdownNow();
        }
    }

    private boolean appendVolume(TransactionTemplate transactions, Integer typeId, String name,
                                 CountDownLatch bothRead, CountDownLatch writeTogether) {
        try {
            return transactions.execute(status -> {
                AlcoholType type = alcoholTypesTable.findById(typeId).orElseThrow();
                AlcoholVolume volume = alcoholVolumeTable.saveAndFlush(new AlcoholVolume(name, 0.05f));
                type.getVolumeIds().add(volume.getId());
                bothRead.countDown();
                try {
                    if (!writeTogether.await(10, TimeUnit.SECONDS)) {
                        throw new IllegalStateException("Timed out waiting for the other writer");
                    }
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(exception);
                }
                alcoholTypesTable.saveAndFlush(type);
                return true;
            });
        } catch (OptimisticLockingFailureException exception) {
            return false;
        }
    }
}

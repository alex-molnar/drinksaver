package com.drinksaver.repository.postgres.schema;

import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * One Postgres for the whole test run.
 *
 * Deliberately does NOT use @Testcontainers/@Container. Those manage the
 * container per test class: a static @Container field is started before the
 * class and STOPPED after it, so the first integration class to finish would
 * shut the database down and every later class would sit waiting on a dead
 * connection until Hikari timed out after 30 seconds.
 *
 * Instead the container starts once from a static initialiser and is never
 * stopped explicitly. Testcontainers' Ryuk sidecar removes it when the JVM
 * exits, so nothing is left running.
 *
 * The Docker check appears twice on purpose. The static initialiser guard stops
 * class loading from throwing on a machine with no Docker, and @EnabledIf then
 * skips the tests rather than failing them. The `ci` Maven profile sets
 * drinksaver.requireDocker so CI fails loudly instead of quietly testing
 * nothing.
 */
@DataJpaTest
@EnabledIf("dockerAvailableOrRequired")
abstract class AbstractPostgresIntegrationTest {

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    static {
        if (dockerAvailable()) {
            POSTGRES.start();
        }
    }

    static boolean dockerAvailable() {
        return DockerClientFactory.instance().isDockerAvailable();
    }

    /**
     * True when Docker is present, or when CI has demanded it: in that case the
     * tests run and fail on the missing database rather than silently skipping.
     */
    static boolean dockerAvailableOrRequired() {
        return dockerAvailable() || Boolean.getBoolean("drinksaver.requireDocker");
    }
}

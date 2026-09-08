package com.drinksaver.repository.postgres.schema;

import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * One Postgres for the whole test run.
 *
 * Two details here are load-bearing and easy to get wrong.
 *
 * There is deliberately no @Container on the field. @Container makes JUnit own
 * the lifecycle per test class: a static one is started before the class and
 * STOPPED after it, so the first integration class to finish would shut the
 * database down and every later class would block until Hikari gave up after
 * 30 seconds. That failure mode cost 13 errored tests before it was spotted.
 * Without @Container, Spring Boot's @ServiceConnection support starts the
 * container when it first needs connection details and leaves it running, so
 * all the integration classes share one. Ryuk removes it when the JVM exits.
 *
 * @Testcontainers is still present, without @Container, purely for
 * disabledWithoutDocker: it contributes the condition that skips these tests on
 * a machine with no Docker, which is right for a laptop. CI must not rely on
 * that leniency, so backend/scripts/assert-integration-tests-ran.sh asserts
 * afterwards that every *IntegrationTest class produced a report with tests in
 * it. That script discovers the classes from this source tree, so a new
 * integration test is covered by it without anyone remembering to add it.
 */
@DataJpaTest
@Testcontainers(disabledWithoutDocker = true)
abstract class AbstractPostgresIntegrationTest {

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");
}

# Test framework bootstrap

Date: 2026-09-07
Status: approved

## Problem

The repository has no test infrastructure at all. `backend/pom.xml` declares no test
dependency, so `mvn package` compiles and packages without ever running a test. The web app
has no test runner. CI therefore has nothing to gate on, and every feature that follows the
mandatory test first workflow has nowhere to put a test.

A previous pass deferred Vitest because Vite was on a very new major and compatibility could
not be verified offline. That question is now settled: Vitest 5.0.0 declares
`vite: ^6.4.0 || ^7.0.0 || ^8.0.0`, and the installed Vite is 8.0.8.

## Goals

1. A working JUnit 5 setup for the backend, including real Postgres integration testing.
2. A working Vitest setup for the web app, including component testing.
3. Both wired into CI so a failing test stops a deploy and stops a publish.
4. Enough seed coverage that future features have a pattern to copy.

Not a goal: a coverage threshold. Deliberately deferred so the first number is not an
arbitrary one.

## Backend

### Dependencies

Four test scoped additions to `backend/pom.xml`. Every version is managed by the Spring Boot
4.0.2 parent, so none is pinned here.

| Artifact | Why |
|---|---|
| `org.springframework.boot:spring-boot-starter-test` | JUnit 5, AssertJ, Mockito |
| `org.springframework.security:spring-security-test` | Mock JWT. Every controller sits behind the OAuth2 resource server. |
| `org.springframework.boot:spring-boot-testcontainers` | `@ServiceConnection`. This is a module, not a starter. |
| `org.testcontainers:junit-jupiter` | `@Testcontainers`, `@Container` |
| `org.testcontainers:postgresql` | `PostgreSQLContainer` |

### Structure

Tests live in `backend/src/test/java/com/drinksaver/`, mirroring the main tree.

Two tiers:

**Unit tests, no Spring context.** Services and the `Postgres*Repository` classes, with their
`repository/postgres/schema/*Table` Spring Data interfaces mocked. This is where most logic
lives and these tests stay in the millisecond range.

**Integration tests.** `@DataJpaTest` combined with
`@Testcontainers(disabledWithoutDocker = true)` and an `@ServiceConnection PostgreSQLContainer`.
These exercise the real derived queries against real Postgres, which is the only way the
hand written query methods and JPA mappings get checked.

`disabledWithoutDocker = true` is deliberate. A developer machine with no Docker running
skips these rather than failing the build. CI runners always have Docker, so coverage is not
silently lost where it matters.

`spring.jpa.hibernate.ddl-auto=update` creates the schema in the container from the entity
classes, so no migration tooling is required. Reference data from `backend/sql/*.sql` is
loaded with `@Sql` only in the tests that need it.

`backend/src/test/resources/application.yaml` overrides `JWT_ISSUER_URI` and
`JWT_JWK_SET_URI`. Without it, any context loading test reaches out to the live Keycloak at
`auth.drinksaver.kak.im`, which makes the suite depend on production being up.

## Web

### Dependencies

| Package | Version | Why |
|---|---|---|
| `vitest` | 5 | Test runner. Peer range covers Vite 8. |
| `@vitest/coverage-v8` | 5 | Coverage reporting on demand |
| `jsdom` | 30 | DOM for component tests |
| `@testing-library/react` | 16.3.3 | Peer range covers React 19 |
| `@testing-library/jest-dom` | 7 | DOM matchers |
| `@testing-library/user-event` | 14 | Realistic interaction |

### Configuration

A `test` block in `vite.config.ts` (jsdom environment, globals enabled, `src/test/setup.ts`
as a setup file), `test` and `test:watch` scripts in `package.json`, and `vitest/globals`
added to `types` in `tsconfig.app.json`.

### The config.ts import time wrinkle

`web/src/config.ts` evaluates its exported `config` object at module import time. Testing the
fallback chain therefore requires `vi.resetModules()` and a dynamic `import()` per case, with
`window.__DRINKSAVER_CONFIG__` and `import.meta.env` stubbed before the import.

Without this, every case observes the values captured by the first import and the tests pass
while proving nothing. This is the single most likely way this setup goes quietly wrong.

## Seed coverage

Backend:

- `RecommendationService` and the recommendation sources. Decay factor and max personal
  recommendations are real logic with real branching.
- `PostgresBeerRepository` with mocked tables, covering the admin user list merge in
  `getBrands`.
- One Testcontainers test over `BrandsTable.findAllByUserIdInOrderByName`, covering user
  filtering and result ordering.

Web:

- `config.ts`: injected value wins, placeholder rejection for both the `${` and `__` prefixes,
  build time env fallback, and the localhost default.
- One component test to establish the React Testing Library pattern.

These seed tests describe code that already exists, so they are characterization tests rather
than red to green. The framework wiring itself is genuinely red to green.

## CI

**Backend: no workflow change.** `mvn package` runs tests by default, in both `build.yml` and
`deploy-test-backend.yml`. The `ubuntu-latest` runner provides the Docker daemon Testcontainers
needs, independently of the Buildx setup step that follows.

**Web: two workflow edits.** A Node setup, `npm ci`, and `npm run test -- --run` step is added
ahead of the image build in `deploy-test-web.yml` and in the `web` job of `build.yml`. A failing
test then stops the test deploy and stops the publish, matching what the backend already does.

Cost: roughly 30 to 40 seconds of `npm ci` duplicated against the one inside the Docker build.

Rejected alternative: running Vitest inside the Dockerfile. It avoids the duplicate install but
couples test failures to Docker layer caching and makes a red test present as a build error.

## Versioning

No `VERSION` bump. Nothing that ships changes: no image content, no chart, no runtime
behaviour.

## Documentation

`docs/DEPLOYMENT.md` loses the two test related bullets under "Follow-ups not done here" and
records that the Vite 8 compatibility question is resolved. `CLAUDE.md` moves its Testing
section from target state to current state and drops the matching Known debt entries.

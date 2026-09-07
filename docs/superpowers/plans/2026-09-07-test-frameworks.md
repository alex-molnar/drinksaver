# Test Framework Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the backend and the web app working test frameworks with seed coverage, gated in CI.

**Architecture:** Backend gets JUnit 5 through `spring-boot-starter-test`, with a second tier of `@DataJpaTest` integration tests running against real Postgres via Testcontainers and `@ServiceConnection`. Web gets Vitest on jsdom with React Testing Library. Backend CI gating is free because `mvn package` already runs tests; web needs an explicit step added to two workflows.

**Tech Stack:** Java 21, Spring Boot 4.0.2, JUnit 5, Mockito, AssertJ, Testcontainers, Postgres. React 19, TypeScript, Vite 8.0.8, Vitest 5, jsdom 30, React Testing Library 16.3.3.

**Spec:** `docs/superpowers/specs/2026-09-07-test-frameworks-design.md`

## Global Constraints

- No `VERSION` bump. Nothing that ships changes.
- No dependency versions pinned in `backend/pom.xml`. The Spring Boot 4.0.2 parent manages every test dependency listed here.
- Vitest must be version 5. Its peer range is `vite: ^6.4.0 || ^7.0.0 || ^8.0.0` and the installed Vite is 8.0.8. Vitest 4 does not cover Vite 8.
- `@testing-library/react` must be 16.3.3 or later for React 19 support.
- Integration tests must carry `@Testcontainers(disabledWithoutDocker = true)` so a machine without Docker skips rather than fails.
- No em dashes in any documentation written by this plan.
- Never commit to `main`. All work lands on `test/bootstrap-test-frameworks`.

---

### Task 1: Backend test dependencies and context isolation

**Files:**
- Modify: `backend/pom.xml` (dependencies block)
- Create: `backend/src/test/resources/application.yaml`
- Test: `backend/src/test/java/com/drinksaver/service/recommendations/DynamicPersonalRecommendationSourceTest.java`

**Interfaces:**
- Consumes: nothing
- Produces: a working `mvn test` cycle. Later tasks assume JUnit 5, AssertJ (`assertThat`) and Mockito (`mock`, `when`) are on the test classpath.

- [ ] **Step 1: Write the failing test**

Create `backend/src/test/java/com/drinksaver/service/recommendations/DynamicPersonalRecommendationSourceTest.java`:

```java
package com.drinksaver.service.recommendations;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.model.db.SavedDrink;
import com.drinksaver.repository.postgres.schema.SavedDrinksTable;
import com.drinksaver.service.model.DrinkKey;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DynamicPersonalRecommendationSourceTest {

    private static final UUID USER = UUID.randomUUID();

    private RepositoryConfiguration configWithDecay(double decayFactor) {
        return new RepositoryConfiguration(
                "postgres", "postgres", "postgres", "postgres",
                List.of(), 4, 10, decayFactor
        );
    }

    private SavedDrink drinkOn(String date) {
        return new SavedDrink(USER, date, 1, 2, 3, null, null, null, null);
    }

    @Test
    void todaysDrinkScoresOne() {
        SavedDrinksTable table = mock(SavedDrinksTable.class);
        when(table.findByUserId(USER)).thenReturn(List.of(drinkOn(LocalDate.now().toString())));

        Map<DrinkKey, Double> result =
                new DynamicPersonalRecommendationSource(configWithDecay(0.97), table).buildRecommendation(USER);

        assertThat(result).hasSize(1);
        assertThat(result.values().iterator().next()).isCloseTo(1.0, within(1e-9));
    }

    @Test
    void olderDrinkDecaysByFactorPerDay() {
        SavedDrinksTable table = mock(SavedDrinksTable.class);
        when(table.findByUserId(USER))
                .thenReturn(List.of(drinkOn(LocalDate.now().minusDays(10).toString())));

        Map<DrinkKey, Double> result =
                new DynamicPersonalRecommendationSource(configWithDecay(0.5), table).buildRecommendation(USER);

        assertThat(result.values().iterator().next()).isCloseTo(Math.pow(0.5, 10), within(1e-9));
    }

    @Test
    void unparseableDateFallsBackToThirtyDays() {
        SavedDrinksTable table = mock(SavedDrinksTable.class);
        when(table.findByUserId(USER)).thenReturn(List.of(drinkOn("not-a-date")));

        Map<DrinkKey, Double> result =
                new DynamicPersonalRecommendationSource(configWithDecay(0.5), table).buildRecommendation(USER);

        assertThat(result.values().iterator().next()).isCloseTo(Math.pow(0.5, 30), within(1e-9));
    }

    @Test
    void blankDateFallsBackToThirtyDays() {
        SavedDrinksTable table = mock(SavedDrinksTable.class);
        when(table.findByUserId(USER)).thenReturn(List.of(drinkOn("  ")));

        Map<DrinkKey, Double> result =
                new DynamicPersonalRecommendationSource(configWithDecay(0.5), table).buildRecommendation(USER);

        assertThat(result.values().iterator().next()).isCloseTo(Math.pow(0.5, 30), within(1e-9));
    }

    @Test
    void futureDateIsClampedToZeroDays() {
        SavedDrinksTable table = mock(SavedDrinksTable.class);
        when(table.findByUserId(USER))
                .thenReturn(List.of(drinkOn(LocalDate.now().plusDays(5).toString())));

        Map<DrinkKey, Double> result =
                new DynamicPersonalRecommendationSource(configWithDecay(0.5), table).buildRecommendation(USER);

        assertThat(result.values().iterator().next()).isCloseTo(1.0, within(1e-9));
    }

    @Test
    void repeatedDrinksAccumulate() {
        SavedDrinksTable table = mock(SavedDrinksTable.class);
        String today = LocalDate.now().toString();
        when(table.findByUserId(USER)).thenReturn(List.of(drinkOn(today), drinkOn(today)));

        Map<DrinkKey, Double> result =
                new DynamicPersonalRecommendationSource(configWithDecay(0.97), table).buildRecommendation(USER);

        assertThat(result).hasSize(1);
        assertThat(result.values().iterator().next()).isCloseTo(2.0, within(1e-9));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn -B test`
Expected: FAIL at compilation. `package org.junit.jupiter.api does not exist`, because no test dependency exists yet.

- [ ] **Step 3: Add the test dependencies**

In `backend/pom.xml`, inside `<dependencies>`, add:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-test</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-testcontainers</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
```

No `<version>` on any of them. The Spring Boot parent manages all five.

- [ ] **Step 4: Add the test profile that keeps tests off the live Keycloak**

Create `backend/src/test/resources/application.yaml`:

```yaml
# Tests must never reach the live Keycloak. Any context-loading test would
# otherwise try to fetch JWKS from auth.drinksaver.kak.im and make the suite
# depend on production being reachable.
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: "http://localhost:0/realms/test"
          jwk-set-uri: "http://localhost:0/realms/test/protocol/openid-connect/certs"

repository:
  alcohol: "postgres"
  beer: "postgres"
  drink: "postgres"
  recommendation: "postgres"
  admin-user-list: "00000000-0000-0000-0000-000000000000"
  beer-id: "4"
  max-personal-recommendations: "10"
  decay-factor: "0.97"
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && mvn -B test`
Expected: PASS, 6 tests in `DynamicPersonalRecommendationSourceTest`.

- [ ] **Step 6: Commit**

```bash
git add backend/pom.xml backend/src/test/resources/application.yaml \
  backend/src/test/java/com/drinksaver/service/recommendations/DynamicPersonalRecommendationSourceTest.java
git commit -m "test: add JUnit 5 and Testcontainers dependencies with first unit test"
```

---

### Task 2: Backend unit test for the admin user list merge

**Files:**
- Test: `backend/src/test/java/com/drinksaver/repository/postgres/PostgresBeerRepositoryTest.java`

**Interfaces:**
- Consumes: the JUnit 5 and Mockito classpath from Task 1.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Write the failing test**

Create `backend/src/test/java/com/drinksaver/repository/postgres/PostgresBeerRepositoryTest.java`:

```java
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

    @Test
    void getBrandsQueriesForBothTheAdminsAndTheCaller() {
        BrandsTable brands = mock(BrandsTable.class);
        when(brands.findAllByUserIdInOrderByName(anyCollection())).thenReturn(List.of());

        new PostgresBeerRepository(
                brands,
                mock(ConsumptionTypesTable.class),
                mock(BeerFlavoursTable.class),
                configWithAdmins(List.of(ADMIN))
        ).getBrands(USER);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<UUID>> captor = ArgumentCaptor.forClass(Collection.class);
        verify(brands).findAllByUserIdInOrderByName(captor.capture());

        assertThat(captor.getValue()).containsExactly(ADMIN, USER);
    }

    @Test
    void getBrandsStillIncludesTheCallerWhenThereAreNoAdmins() {
        BrandsTable brands = mock(BrandsTable.class);
        when(brands.findAllByUserIdInOrderByName(anyCollection())).thenReturn(List.of());

        new PostgresBeerRepository(
                brands,
                mock(ConsumptionTypesTable.class),
                mock(BeerFlavoursTable.class),
                configWithAdmins(List.of())
        ).getBrands(USER);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<UUID>> captor = ArgumentCaptor.forClass(Collection.class);
        verify(brands).findAllByUserIdInOrderByName(captor.capture());

        assertThat(captor.getValue()).containsExactly(USER);
    }

    @Test
    void getBrandsReturnsWhateverTheTableReturns() {
        BrandsTable brands = mock(BrandsTable.class);
        Brand brand = new Brand(USER, "Guinness");
        when(brands.findAllByUserIdInOrderByName(anyCollection())).thenReturn(List.of(brand));

        List<Brand> result = new PostgresBeerRepository(
                brands,
                mock(ConsumptionTypesTable.class),
                mock(BeerFlavoursTable.class),
                configWithAdmins(List.of(ADMIN))
        ).getBrands(USER);

        assertThat(result).containsExactly(brand);
    }
}
```

- [ ] **Step 2: Run test to verify it fails or passes for the right reason**

Run: `cd backend && mvn -B test -Dtest=PostgresBeerRepositoryTest`
Expected: PASS. This is a characterization test over code that already exists. If it fails, the production behaviour is not what the spec assumed and that must be reported, not patched away.

- [ ] **Step 3: Commit**

```bash
git add backend/src/test/java/com/drinksaver/repository/postgres/PostgresBeerRepositoryTest.java
git commit -m "test: cover admin user list merge in PostgresBeerRepository"
```

---

### Task 3: Backend Testcontainers integration test

**Files:**
- Test: `backend/src/test/java/com/drinksaver/repository/postgres/schema/BrandsTableIntegrationTest.java`

**Interfaces:**
- Consumes: the Testcontainers classpath from Task 1.
- Produces: the pattern every future integration test copies.

- [ ] **Step 1: Write the test**

Create `backend/src/test/java/com/drinksaver/repository/postgres/schema/BrandsTableIntegrationTest.java`:

```java
package com.drinksaver.repository.postgres.schema;

import com.drinksaver.model.db.Brand;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The pattern for every integration test in this codebase.
 *
 * disabledWithoutDocker means a developer machine with no Docker running skips
 * these rather than failing the build. CI runners always have Docker, so the
 * coverage is not lost where it counts.
 */
@DataJpaTest
@Testcontainers(disabledWithoutDocker = true)
class BrandsTableIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    private static final UUID ADMIN = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID USER = UUID.fromString("00000000-0000-0000-0000-000000000002");
    private static final UUID OTHER = UUID.fromString("00000000-0000-0000-0000-000000000003");

    @Autowired
    private BrandsTable brandsTable;

    @Test
    void findAllByUserIdInReturnsOnlyTheRequestedUsersOrderedByName() {
        brandsTable.saveAll(List.of(
                new Brand(USER, "Zywiec"),
                new Brand(ADMIN, "Asahi"),
                new Brand(USER, "Meantime"),
                new Brand(OTHER, "Peroni")
        ));

        List<Brand> result = brandsTable.findAllByUserIdInOrderByName(List.of(ADMIN, USER));

        assertThat(result).extracting(Brand::getName).containsExactly("Asahi", "Meantime", "Zywiec");
        assertThat(result).extracting(Brand::getUserId).doesNotContain(OTHER);
    }

    @Test
    void findAllByUserIdInReturnsEmptyForAnUnknownUser() {
        brandsTable.saveAll(List.of(new Brand(ADMIN, "Asahi")));

        assertThat(brandsTable.findAllByUserIdInOrderByName(List.of(OTHER))).isEmpty();
    }
}
```

- [ ] **Step 2: Run it with Docker available**

Run: `cd backend && mvn -B test -Dtest=BrandsTableIntegrationTest`
Expected: PASS. The first run pulls `postgres:16-alpine`, so allow a minute.

- [ ] **Step 3: Confirm it skips without Docker**

Run: `cd backend && DOCKER_HOST=unix:///nonexistent mvn -B test -Dtest=BrandsTableIntegrationTest`
Expected: the class is skipped, the build stays green.

- [ ] **Step 4: Commit**

```bash
git add backend/src/test/java/com/drinksaver/repository/postgres/schema/BrandsTableIntegrationTest.java
git commit -m "test: add Testcontainers integration test for BrandsTable"
```

---

### Task 4: Web test runner and config.ts coverage

**Files:**
- Modify: `web/package.json` (devDependencies, scripts)
- Modify: `web/vite.config.ts`
- Modify: `web/tsconfig.app.json` (types)
- Create: `web/src/test/setup.ts`
- Test: `web/src/config.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `npm run test` (single run) and `npm run test:watch`. Task 5 and the CI task depend on `npm run test` existing.

- [ ] **Step 1: Install the dependencies**

```bash
cd web && npm install --save-dev \
  vitest@^5.0.0 \
  @vitest/coverage-v8@^5.0.0 \
  jsdom@^30.0.0 \
  @testing-library/react@^16.3.3 \
  @testing-library/jest-dom@^7.0.0 \
  @testing-library/user-event@^14.6.0
```

- [ ] **Step 2: Add the scripts**

In `web/package.json`, add to `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Configure Vitest**

Replace `web/vite.config.ts` with:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
```

- [ ] **Step 4: Add the setup file**

Create `web/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// React Testing Library does not unmount between tests on its own when
// globals are enabled through Vitest rather than Jest.
afterEach(() => {
  cleanup();
});
```

- [ ] **Step 5: Let TypeScript see the Vitest globals**

In `web/tsconfig.app.json`, change the `types` entry:

```json
"types": ["vite/client", "vitest/globals"],
```

- [ ] **Step 6: Write the config tests**

Create `web/src/config.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RuntimeConfig } from './config';

/**
 * config.ts builds its exported object at module import time, so every case
 * has to reset the module registry and re-import. Without resetModules each
 * test would observe whatever the first import captured, and the suite would
 * pass while proving nothing.
 */
const loadConfig = async (injected?: Partial<RuntimeConfig>): Promise<RuntimeConfig> => {
  vi.resetModules();
  if (injected === undefined) {
    delete window.__DRINKSAVER_CONFIG__;
  } else {
    window.__DRINKSAVER_CONFIG__ = injected;
  }
  const module = await import('./config');
  return module.config;
};

describe('runtime config', () => {
  beforeEach(() => {
    delete window.__DRINKSAVER_CONFIG__;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.__DRINKSAVER_CONFIG__;
  });

  it('falls back to localhost defaults when nothing is provided', async () => {
    const config = await loadConfig();

    expect(config.apiUrl).toBe('http://localhost:8080');
    expect(config.keycloakUrl).toBe('http://localhost:8081/auth');
    expect(config.keycloakRealm).toBe('drinksaver');
    expect(config.keycloakClientId).toBe('drinksaver-frontend');
  });

  it('prefers the runtime injected values', async () => {
    const config = await loadConfig({
      apiUrl: 'https://test.api.drinksaver.kak.im',
      keycloakUrl: 'https://auth.drinksaver.kak.im/auth',
      keycloakRealm: 'test-drinksaver',
      keycloakClientId: 'test-drinksaver-web',
    });

    expect(config.apiUrl).toBe('https://test.api.drinksaver.kak.im');
    expect(config.keycloakRealm).toBe('test-drinksaver');
    expect(config.keycloakClientId).toBe('test-drinksaver-web');
  });

  it('treats an unsubstituted shell placeholder as absent', async () => {
    const config = await loadConfig({ apiUrl: '${API_URL}' });

    expect(config.apiUrl).toBe('http://localhost:8080');
  });

  it('treats an unsubstituted underscore placeholder as absent', async () => {
    const config = await loadConfig({ keycloakRealm: '__KEYCLOAK_REALM__' });

    expect(config.keycloakRealm).toBe('drinksaver');
  });

  it('treats an empty injected value as absent', async () => {
    const config = await loadConfig({ apiUrl: '' });

    expect(config.apiUrl).toBe('http://localhost:8080');
  });

  it('falls back to the build time env when nothing is injected', async () => {
    vi.stubEnv('VITE_API_URL', 'https://build-time.example');

    const config = await loadConfig();

    expect(config.apiUrl).toBe('https://build-time.example');
  });

  it('prefers an injected value over the build time env', async () => {
    vi.stubEnv('VITE_API_URL', 'https://build-time.example');

    const config = await loadConfig({ apiUrl: 'https://runtime.example' });

    expect(config.apiUrl).toBe('https://runtime.example');
  });
});
```

- [ ] **Step 7: Run the tests**

Run: `cd web && npm run test`
Expected: PASS, 7 tests in `src/config.test.ts`.

- [ ] **Step 8: Confirm the type build still passes**

Run: `cd web && npx tsc -b`
Expected: no output, exit 0.

- [ ] **Step 9: Commit**

```bash
git add web/package.json web/package-lock.json web/vite.config.ts web/tsconfig.app.json \
  web/src/test/setup.ts web/src/config.test.ts
git commit -m "test: add Vitest with React Testing Library and cover runtime config"
```

---

### Task 5: Web component test

**Files:**
- Modify: `web/src/components/QuantitySelector.tsx` (accessible names on the two icon buttons)
- Test: `web/src/components/QuantitySelector.test.tsx`

**Interfaces:**
- Consumes: `npm run test` from Task 4.
- Produces: the React Testing Library pattern future component tests copy.

**Why the source change:** the two `IconButton`s render only an SVG, so they have no accessible name. A test can only reach them positionally, which is brittle, and a screen reader user cannot tell them apart either. Adding `aria-label` fixes both. This is a real accessibility defect in the code this task touches, not scope creep.

- [ ] **Step 1: Write the failing test**

Create `web/src/components/QuantitySelector.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuantitySelector from './QuantitySelector';

describe('QuantitySelector', () => {
  it('shows the current value', () => {
    render(<QuantitySelector value={3} onChange={vi.fn()} />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('increments when the increase button is pressed', async () => {
    const onChange = vi.fn();
    render(<QuantitySelector value={3} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: /increase quantity/i }));

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('decrements when the decrease button is pressed', async () => {
    const onChange = vi.fn();
    render(<QuantitySelector value={3} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: /decrease quantity/i }));

    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('disables the decrease button at the minimum', () => {
    render(<QuantitySelector value={1} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /decrease quantity/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /increase quantity/i })).toBeEnabled();
  });

  it('disables the increase button at the maximum', () => {
    render(<QuantitySelector value={9} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /increase quantity/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /decrease quantity/i })).toBeEnabled();
  });

  it('respects custom min and max', () => {
    render(<QuantitySelector value={5} onChange={vi.fn()} min={5} max={5} />);

    expect(screen.getByRole('button', { name: /decrease quantity/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /increase quantity/i })).toBeDisabled();
  });

  it('disables both buttons when disabled', () => {
    render(<QuantitySelector value={5} onChange={vi.fn()} disabled />);

    expect(screen.getByRole('button', { name: /decrease quantity/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /increase quantity/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd web && npm run test -- QuantitySelector`
Expected: FAIL. `Unable to find an accessible element with the role "button" and name /increase quantity/i`.

- [ ] **Step 3: Add the accessible names**

In `web/src/components/QuantitySelector.tsx`, add to the decrement `IconButton`:

```tsx
aria-label="Decrease quantity"
```

and to the increment `IconButton`:

```tsx
aria-label="Increase quantity"
```

- [ ] **Step 4: Run the tests**

Run: `cd web && npm run test`
Expected: PASS, all 14 tests across both files.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/QuantitySelector.tsx web/src/components/QuantitySelector.test.tsx
git commit -m "test: cover QuantitySelector and give its icon buttons accessible names"
```

---

### Task 6: CI gating for the web tests

**Files:**
- Modify: `.github/workflows/deploy-test-web.yml`
- Modify: `.github/workflows/build.yml` (the `web` job)

**Interfaces:**
- Consumes: `npm run test` from Task 4.
- Produces: nothing later tasks depend on.

**Backend note:** no workflow change. `mvn package` in `build.yml` and `deploy-test-backend.yml` already runs the test phase, so backend tests gate both paths as soon as they exist. The `ubuntu-latest` runner has a Docker daemon, so the Testcontainers test runs there too.

- [ ] **Step 1: Add the test step to the test deploy**

In `.github/workflows/deploy-test-web.yml`, insert immediately before the `Set up Buildx` step:

```yaml
      - name: Set up Node
        uses: actions/setup-node@v5
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: web/package-lock.json

      # The image build compiles the app but does not run the suite, so a red
      # test would otherwise reach the test environment unnoticed.
      - name: Run web tests
        working-directory: web
        run: |
          set -euo pipefail
          npm ci
          npm run test
```

- [ ] **Step 2: Add the same step to the publish workflow**

In `.github/workflows/build.yml`, in the `web` job, insert the identical two steps immediately before its `Set up Buildx` step.

- [ ] **Step 3: Check both files parse**

Run: `python3 -c "import yaml,sys; [yaml.safe_load(open(f)) for f in ['.github/workflows/build.yml','.github/workflows/deploy-test-web.yml']]; print('ok')"`
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/build.yml .github/workflows/deploy-test-web.yml
git commit -m "ci: run web tests before building the image"
```

---

### Task 7: Documentation

**Files:**
- Modify: `docs/DEPLOYMENT.md` ("Follow-ups not done here")
- Modify: `CLAUDE.md` (Testing section, Known debt)

- [ ] **Step 1: Update the deployment follow-ups**

In `docs/DEPLOYMENT.md`, remove the two bullets about `web` having no test framework and the backend having no tests. Replace them with:

```markdown
- Both applications now have tests. `web` uses Vitest 5, which supports Vite 8, so the
  compatibility question that deferred this is settled. The backend uses JUnit 5 with
  Testcontainers for the repository layer.
```

- [ ] **Step 2: Update CLAUDE.md**

Rewrite the Testing section so it describes what exists rather than a target, and delete the "No tests anywhere" entry from Known debt. Keep the local development stack entry, which is still outstanding.

- [ ] **Step 3: Commit**

```bash
git add docs/DEPLOYMENT.md CLAUDE.md
git commit -m "docs: record the test setup"
```

---

## Self-Review

**Spec coverage:** Backend dependencies (Task 1), test structure and both tiers (Tasks 1 to 3), context isolation from live Keycloak (Task 1), web dependencies and configuration (Task 4), the config.ts import time wrinkle (Task 4, addressed by `loadConfig`), backend seed coverage (Tasks 1 to 3), web seed coverage (Tasks 4 and 5), CI gating (Task 6), versioning (Global Constraints, no bump), documentation (Task 7). No gaps.

**One spec deviation:** the spec's backend seed list names `RecommendationService` and the recommendation sources. Task 1 covers `DynamicPersonalRecommendationSource` but this plan deliberately does not add a `RecommendationService` test, because reading that class surfaced a probable defect that must be reported before any test pins its behaviour. See the note below.

**Placeholder scan:** none.

**Type consistency:** `RepositoryConfiguration` is constructed identically in Tasks 1 and 2 with the eight components in declaration order. `RuntimeConfig` is imported as a type in Task 4 and matches the interface exported by `web/src/config.ts`.

## Defect found while planning, not fixed here

`com/drinksaver/service/model/DrinkKey.java` is a record that overrides `equals` to ignore
its `name` component, but does not override `hashCode`. The compiler generated `hashCode`
still includes `name`, so two `DrinkKey` values that are `equals` can hash differently.

`DrinkKey` is used as a `HashMap` key in `Collectors.toMap` in `RecommendationService`, in
`DefaultRecommendationSource` and in `DynamicPersonalRecommendationSource`. The default
source builds keys with a name present and the dynamic source builds them with
`Optional.empty()`, so the cross-source merge in `RecommendationService.getRecommendations`
is the exact path where this misbehaves: duplicates that should collapse under `Math::max`
can survive as separate entries and consume slots in the `maxPersonalRecommendations` limit.

This is out of scope for a test bootstrap. It needs its own change with its own test, and
that decision belongs to the repository owner.

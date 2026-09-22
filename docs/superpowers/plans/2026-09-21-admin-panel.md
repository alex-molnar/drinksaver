# DrinkSaver Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `admin/`, a desktop-first React application that lets a Keycloak `admin` group member curate color palettes, glassware, default recommendations and user-created catalogue entries.

**Architecture:** A standalone Vite + React app, sibling to `web/` and `backend/`, with its own image, Helm chart, ingress, Keycloak client and GitHub Actions workflows, sharing only the root `VERSION` file. It copies about 400 lines of infrastructure from `web/` (runtime config, axios client, Keycloak provider, theme tokens) rather than introducing an npm workspace. Admin areas are registered in a single array so a future feature is one folder plus one line.

**Tech Stack:** Vite 8, React 19, TypeScript 6, MUI 9, TanStack Query 5, keycloak-js 26, React Router 7, axios, @dnd-kit, Vitest 5 with jsdom and React Testing Library, eslint 10, nginx, Helm, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-21-admin-panel-design.md`

## Global Constraints

- The backend endpoints in spec section 5 do not exist yet. Every test mocks `admin/src/api/admin.ts` with `vi.mock`. Nothing in this plan requires a running backend.
- Node 24 in CI. Do not use Node 20: jsdom 30 fails at import with `webidl.util.markAsUncloneable is not a function`.
- Shared dependency versions must match `web/package.json` exactly, so the two apps cannot drift into different React or MUI majors.
- The root `VERSION` file is the single source of truth. Never hand-edit the version in `admin/package.json`; CI stamps it with `jq`.
- No color literals in `admin/src/sections/**` or `admin/src/components/**`. Read `var(--ds-*)` tokens. The eslint rule in Task 1 enforces this, matching `web/eslint.config.js`. The palette and glassware editors are exempt by path, because editing literal values is their entire job.
- The client never sends a user id in any payload. The server derives identity from the JWT.
- Never print, log or commit `KUBE_CONFIG`, database credentials or Keycloak client secrets.
- All work happens on the current branch `feat/admin-panel-design`. Commit after every task. Do not push.

---

### Task 1: Scaffold the admin application

**Files:**
- Create: `admin/package.json`, `admin/vite.config.ts`, `admin/tsconfig.json`, `admin/tsconfig.app.json`, `admin/tsconfig.node.json`, `admin/eslint.config.js`, `admin/index.html`, `admin/.gitignore`, `admin/.dockerignore`, `admin/src/main.tsx`, `admin/src/index.css`, `admin/src/test/setup.ts`
- Test: `admin/src/smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: working `npm test`, `npm run lint` and `npm run build` in `admin/`. Every later task assumes these three commands exist and are green.

- [ ] **Step 1: Create `admin/package.json`**

Version is `0.0.0` on purpose. CI overwrites it from `VERSION`; a hand-maintained number here would be a second source of truth that is wrong most of the time.

```json
{
  "name": "drinksaver-admin",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/modifiers": "^9.0.0",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@emotion/react": "^11.14.0",
    "@emotion/styled": "^11.14.1",
    "@fontsource-variable/familjen-grotesk": "5.3.0",
    "@fontsource-variable/fraunces": "5.3.0",
    "@mui/icons-material": "^9.4.0",
    "@mui/material": "^9.4.0",
    "@tanstack/react-query": "^5.102.8",
    "axios": "^1.15.0",
    "keycloak-js": "^26.0.0",
    "react": "^19.2.8",
    "react-dom": "^19.3.0",
    "react-router-dom": "^7.14.1"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@testing-library/jest-dom": "^7.0.1",
    "@testing-library/react": "^16.3.3",
    "@testing-library/user-event": "^14.6.7",
    "@types/node": "^26.5.1",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^6.1.1",
    "@vitest/coverage-v8": "^5.0.0",
    "eslint": "^10.10.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.6",
    "globals": "^17.12.0",
    "jsdom": "^30.0.1",
    "typescript": "~6.0.3",
    "typescript-eslint": "^8.70.0",
    "vite": "^8.2.2",
    "vitest": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create `admin/vite.config.ts`**

Coverage thresholds are zero for now. Task 14 measures the finished suite and sets the real floors. Committing an invented number here would either fail every build or gate nothing.

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    testTimeout: 15_000,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/vite-env.d.ts', 'src/main.tsx'],
      // Placeholder floors. Task 14 replaces these with the measured values,
      // the date, and the ratchet comment this repository uses everywhere else.
      thresholds: { statements: 0, branches: 0, functions: 0, lines: 0 },
    },
  },
})
```

- [ ] **Step 3: Create the TypeScript configs**

`admin/tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`admin/tsconfig.app.json`:

`"types": ["vite/client"]` declares the `*.css` module so `main.tsx`'s side-effect
import `import './index.css'` survives `noUncheckedSideEffectImports` — the same
mechanism `web/tsconfig.app.json` uses. Without it `tsc -b` fails with TS2882 before
Task 2's `vite-env.d.ts` exists, so it cannot wait.

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "types": ["vite/client"],
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

`admin/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create `admin/eslint.config.js`**

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    /**
     * No colour literals in the shell or in a section's layout. Same rule and same
     * reasoning as web/eslint.config.js: a second theme stays a token file only while
     * every component reads var(--ds-*).
     *
     * The palette and glassware editors are exempt by path. Their job is to show and
     * edit literal colour and path values, and a preview that read a token instead of
     * the value being edited would not be a preview.
     */
    files: ['src/components/**/*.{ts,tsx}', 'src/sections/**/*.{ts,tsx}'],
    ignores: [
      '**/*.test.{ts,tsx}',
      'src/sections/palettes/**',
      'src/sections/glassware/**',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
          message:
            'No colour literals here. Read a token instead: var(--ds-*). Tokens live in src/theme.',
        },
      ],
    },
  },
])
```

- [ ] **Step 5: Create `admin/index.html`, `admin/src/main.tsx` and `admin/src/index.css`**

`admin/index.html`. The `config.js` script tag must come before the module, or the bundle reads an undefined global:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow" />
    <title>DrinkSaver Admin</title>
    <script src="/config.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`admin/src/main.tsx`. It stays this thin until Task 6 replaces the placeholder with the shell:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div>DrinkSaver Admin</div>
  </StrictMode>
);
```

`admin/src/index.css`:

```css
:root {
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

html,
body,
#root {
  height: 100%;
  margin: 0;
}
```

- [ ] **Step 6: Create `admin/.gitignore` and `admin/.dockerignore`**

`admin/.gitignore`:

```
node_modules
dist
coverage
*.local
.DS_Store
```

`admin/.dockerignore`:

```
node_modules
dist
coverage
.git
*.md
```

- [ ] **Step 7: Create `admin/src/test/setup.ts`**

No `getBoundingClientRect` stub yet. Task 10 adds one when the drag reorder needs it, so the fiction arrives with the test that requires it rather than up front.

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only auto-cleans when it detects a global afterEach from a
// supported framework. Registering it explicitly keeps each test mounting into
// a fresh DOM regardless of how globals are configured.
afterEach(() => {
  cleanup();
});
```

- [ ] **Step 8: Write the smoke test**

`admin/src/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('admin toolchain', () => {
  it('runs a test in jsdom with a DOM available', () => {
    const element = document.createElement('div');
    element.textContent = 'DrinkSaver Admin';
    expect(element.textContent).toBe('DrinkSaver Admin');
  });
});
```

- [ ] **Step 9: Install and run the whole toolchain**

```bash
cd admin && npm install && npm run lint && npm test && npm run build
```

Expected: `npm install` writes `admin/package-lock.json`, lint passes with no errors, one test passes, and `dist/` is produced.

- [ ] **Step 10: Commit**

```bash
git add admin/
git commit -m "feat(admin): scaffold the admin application"
```

---

### Task 2: Runtime configuration

**Files:**
- Create: `admin/src/config.ts`, `admin/src/vite-env.d.ts`, `admin/public/config.js`, `admin/public/favicon.svg`
- Test: `admin/src/config.test.ts`

**Interfaces:**
- Consumes: Task 1's toolchain.
- Produces: `export interface RuntimeConfig { apiUrl: string; keycloakUrl: string; keycloakRealm: string; keycloakClientId: string }` and `export default config` from `admin/src/config.ts`. Tasks 3 and 4 import that default.

- [ ] **Step 1: Write the failing test**

`config.ts` builds its export at import time, so each case must reset the module registry and re-import. Same constraint `web/src/config.test.ts` documents.

`admin/src/config.test.ts`:

```ts
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

const loadConfig = async () => {
  vi.resetModules();
  return (await import('./config')).default;
};

describe('admin runtime config', () => {
  beforeEach(() => {
    delete window.__DRINKSAVER_ADMIN_CONFIG__;
  });

  afterEach(() => {
    delete window.__DRINKSAVER_ADMIN_CONFIG__;
  });

  it('falls back to localhost defaults when nothing is injected', async () => {
    const config = await loadConfig();
    expect(config.apiUrl).toBe('http://localhost:8080');
    expect(config.keycloakUrl).toBe('http://localhost:8081/auth');
    expect(config.keycloakRealm).toBe('drinksaver');
    expect(config.keycloakClientId).toBe('drinksaver-admin');
  });

  it('prefers injected values', async () => {
    window.__DRINKSAVER_ADMIN_CONFIG__ = {
      apiUrl: 'https://test.api.drinksaver.kak.im',
      keycloakClientId: 'test-drinksaver-admin',
    };
    const config = await loadConfig();
    expect(config.apiUrl).toBe('https://test.api.drinksaver.kak.im');
    expect(config.keycloakClientId).toBe('test-drinksaver-admin');
  });

  it('treats an unsubstituted placeholder as absent', async () => {
    window.__DRINKSAVER_ADMIN_CONFIG__ = { apiUrl: '${API_URL}', keycloakRealm: '__REALM__' };
    const config = await loadConfig();
    expect(config.apiUrl).toBe('http://localhost:8080');
    expect(config.keycloakRealm).toBe('drinksaver');
  });

  it('does not read the consumer app global', async () => {
    (window as unknown as Record<string, unknown>).__DRINKSAVER_CONFIG__ = {
      apiUrl: 'https://consumer.example',
    };
    const config = await loadConfig();
    expect(config.apiUrl).toBe('http://localhost:8080');
    delete (window as unknown as Record<string, unknown>).__DRINKSAVER_CONFIG__;
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd admin && npx vitest run src/config.test.ts`
Expected: FAIL, cannot resolve `./config`.

- [ ] **Step 3: Write `admin/src/config.ts`**

```ts
/**
 * Runtime configuration.
 *
 * In a container, docker-entrypoint.sh writes /config.js before nginx starts,
 * which sets window.__DRINKSAVER_ADMIN_CONFIG__. That lets one image serve any
 * environment, because nothing environment-specific is baked into the bundle.
 *
 * The global is deliberately distinct from the consumer app's
 * window.__DRINKSAVER_CONFIG__. If the two apps are ever served from one origin,
 * one cannot then silently supply the other's Keycloak client id, which would
 * produce a token whose audience the admin endpoints reject for reasons nobody
 * would connect back to a shared global.
 *
 * During `npm run dev` there is no /config.js, so we fall back to Vite's
 * import.meta.env and then to localhost defaults.
 */

export interface RuntimeConfig {
  apiUrl: string;
  keycloakUrl: string;
  keycloakRealm: string;
  keycloakClientId: string;
}

declare global {
  interface Window {
    __DRINKSAVER_ADMIN_CONFIG__?: Partial<RuntimeConfig>;
  }
}

const injected = typeof window !== 'undefined' ? window.__DRINKSAVER_ADMIN_CONFIG__ : undefined;

/**
 * An unsubstituted placeholder means the entrypoint did not replace the value,
 * so treat it as absent rather than passing "${API_URL}" to Keycloak or axios.
 */
const clean = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  if (value.startsWith('${') || value.startsWith('__')) return undefined;
  return value;
};

const pick = (
  injectedValue: string | undefined,
  buildTimeValue: string | undefined,
  fallback: string
): string => clean(injectedValue) ?? clean(buildTimeValue) ?? fallback;

export const config: RuntimeConfig = {
  apiUrl: pick(injected?.apiUrl, import.meta.env.VITE_API_URL, 'http://localhost:8080'),
  keycloakUrl: pick(injected?.keycloakUrl, import.meta.env.VITE_KEYCLOAK_URL, 'http://localhost:8081/auth'),
  keycloakRealm: pick(injected?.keycloakRealm, import.meta.env.VITE_KEYCLOAK_REALM, 'drinksaver'),
  // A Keycloak client ID, not a local name. It differs per environment and is
  // supplied at runtime; this default only applies to local development.
  keycloakClientId: pick(
    injected?.keycloakClientId,
    import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
    'drinksaver-admin'
  ),
};

export default config;
```

- [ ] **Step 4: Create `admin/src/vite-env.d.ts`**

No `/// <reference types="vite/client" />` line here. Task 1's `tsconfig.app.json`
already loads `vite/client` through `"types": ["vite/client"]`, so a second reference
would be redundant. This file's only job is the `ImportMetaEnv` augmentation.

```ts
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_KEYCLOAK_URL?: string;
  readonly VITE_KEYCLOAK_REALM?: string;
  readonly VITE_KEYCLOAK_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 5: Create `admin/public/config.js` and `admin/public/favicon.svg`**

`admin/public/config.js`, the dev-server stand-in for what the entrypoint writes in a container:

```js
// Local development stand-in. In a container docker-entrypoint.sh overwrites
// this file before nginx starts. Values here are the local compose stack.
window.__DRINKSAVER_ADMIN_CONFIG__ = {
  apiUrl: "http://localhost:8080",
  keycloakUrl: "http://localhost:8081/auth",
  keycloakRealm: "drinksaver",
  keycloakClientId: "drinksaver-admin"
};
```

`admin/public/favicon.svg`, deliberately a different mark from the consumer app's so two open tabs are distinguishable:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#1b1a17"/>
  <path d="M9 9h14M9 16h14M9 23h8" stroke="#e8c37e" stroke-width="2.5" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd admin && npx vitest run src/config.test.ts`
Expected: 4 passed.

- [ ] **Step 7: Commit**

```bash
git add admin/src/config.ts admin/src/config.test.ts admin/src/vite-env.d.ts admin/public/
git commit -m "feat(admin): runtime configuration read from an injected global"
```

---

### Task 3: Keycloak authentication and the admin group gate

**Files:**
- Create: `admin/src/auth/keycloak.ts`, `admin/src/auth/AuthContext.ts`, `admin/src/auth/KeycloakProvider.tsx`, `admin/src/auth/useAuth.ts`, `admin/src/auth/adminGroup.ts`, `admin/src/auth/AdminGate.tsx`
- Test: `admin/src/auth/adminGroup.test.ts`, `admin/src/auth/KeycloakProvider.test.tsx`, `admin/src/auth/AdminGate.test.tsx`

**Interfaces:**
- Consumes: `config` from Task 2.
- Produces:
  - `isAdmin(groups: unknown): boolean` and `ADMIN_GROUP` from `auth/adminGroup.ts`
  - `AuthContextType { isAuthenticated, isLoading, isAdmin, token, userId, username, login, logout, keycloak }` from `auth/AuthContext.ts`
  - Task 6 wraps the shell in `<KeycloakProvider><AdminGate>`.

- [ ] **Step 1: Write the failing test for the group check**

The claim shape is the one thing here not under our control, so it is tested hardest. Keycloak emits `/admin` with full path on, `admin` with it off, and nothing at all if the mapper is missing.

`admin/src/auth/adminGroup.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isAdmin } from './adminGroup';

describe('isAdmin', () => {
  it('accepts a bare group name', () => {
    expect(isAdmin(['admin'])).toBe(true);
  });

  it('accepts a full path, which is what the mapper emits by default', () => {
    expect(isAdmin(['/admin'])).toBe(true);
  });

  it('accepts a nested path whose last segment is admin', () => {
    expect(isAdmin(['/drinksaver/admin'])).toBe(true);
  });

  it('rejects a group that merely contains admin', () => {
    expect(isAdmin(['/administrators'])).toBe(false);
    expect(isAdmin(['not-admin'])).toBe(false);
  });

  it('rejects an absent or malformed claim rather than throwing', () => {
    expect(isAdmin(undefined)).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin('admin')).toBe(false);
    expect(isAdmin([])).toBe(false);
    expect(isAdmin([42, null])).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd admin && npx vitest run src/auth/adminGroup.test.ts`
Expected: FAIL, cannot resolve `./adminGroup`.

- [ ] **Step 3: Write `admin/src/auth/adminGroup.ts`**

```ts
/**
 * Whether a Keycloak `groups` claim grants admin access.
 *
 * Kept free of React and of keycloak-js so the one rule deciding whether the whole
 * application renders can be tested on its own.
 *
 * The claim's shape depends on the Group Membership mapper: with "Full group path"
 * on, Keycloak emits "/admin"; with it off, "admin"; a nested group emits
 * "/parent/admin". Matching the last path segment accepts all three without
 * accepting "/administrators", which a substring check would.
 *
 * This is a user experience guard. The backend rejecting /v1/admin/** for a
 * non-member is the actual control, so a token this mis-reads cannot grant access,
 * only waste a round trip.
 */
export const ADMIN_GROUP = 'admin';

export const isAdmin = (groups: unknown): boolean => {
  if (!Array.isArray(groups)) return false;
  return groups.some(
    (group) => typeof group === 'string' && group.split('/').pop() === ADMIN_GROUP
  );
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd admin && npx vitest run src/auth/adminGroup.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Write `admin/src/auth/keycloak.ts` and `admin/src/auth/AuthContext.ts`**

`admin/src/auth/keycloak.ts`:

```ts
import Keycloak from 'keycloak-js';
import config from '../config';

// Keycloak configuration, supplied at container start by /config.js
const keycloakConfig = {
  url: config.keycloakUrl,
  realm: config.keycloakRealm,
  clientId: config.keycloakClientId,
};

const keycloak = new Keycloak(keycloakConfig);

export default keycloak;
export { keycloakConfig };
```

`admin/src/auth/AuthContext.ts`:

```ts
import { createContext } from 'react';
import type Keycloak from 'keycloak-js';

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Whether the token's groups claim contains the admin group. */
  isAdmin: boolean;
  token: string | undefined;
  userId: string | undefined;
  username: string | undefined;
  login: () => void;
  logout: () => void;
  keycloak: Keycloak;
}

export const AuthContext = createContext<AuthContextType | null>(null);
```

- [ ] **Step 6: Write `admin/src/auth/KeycloakProvider.tsx` and `admin/src/auth/useAuth.ts`**

This is `web/src/auth/KeycloakProvider.tsx` with one addition, `isAdmin`. The Strict Mode comment is carried over because the hazard is identical.

`admin/src/auth/KeycloakProvider.tsx`:

```tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import keycloak from './keycloak';
import { isAdmin as claimGrantsAdmin } from './adminGroup';
import { AuthContext, type AuthContextType } from './AuthContext';

interface KeycloakProviderProps {
  children: React.ReactNode;
}

export const KeycloakProvider: React.FC<KeycloakProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const didInit = useRef(false);
  const refreshInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (!didInit.current) {
      didInit.current = true;
      initKeycloak();
    }

    // Deliberately outside the guard above. The interval is created after
    // keycloak.init resolves, which is after Strict Mode has already double-invoked
    // this effect, so a cleanup returned from inside the guarded branch would be the
    // early return's undefined on the second pass and would never clear anything.
    return () => {
      clearInterval(refreshInterval.current);
      refreshInterval.current = undefined;
    };

    async function initKeycloak() {
      try {
        const authenticated = await keycloak.init({
          onLoad: 'login-required',
          checkLoginIframe: false,
          pkceMethod: 'S256',
        });

        setIsAuthenticated(authenticated);
        setIsAdmin(authenticated && claimGrantsAdmin(keycloak.tokenParsed?.groups));

        if (authenticated) {
          refreshInterval.current = setInterval(() => {
            keycloak.updateToken(70).catch(() => {
              console.warn('Failed to refresh token, logging out');
              keycloak.logout();
            });
          }, 60000);
        }
      } catch (error) {
        console.error('Keycloak initialization failed:', error);
        setIsAuthenticated(false);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  const login = useCallback(() => {
    keycloak.login();
  }, []);

  const logout = useCallback(() => {
    keycloak.logout({ redirectUri: window.location.origin });
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    isAdmin,
    token: keycloak.token,
    userId: keycloak.tokenParsed?.sub,
    username: keycloak.tokenParsed?.preferred_username,
    login,
    logout,
    keycloak,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default KeycloakProvider;
```

`admin/src/auth/useAuth.ts`:

```ts
import { useContext } from 'react';
import { AuthContext, type AuthContextType } from './AuthContext';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within a KeycloakProvider');
  }

  return context;
};

export default useAuth;
```

- [ ] **Step 7: Write the test for the provider's admin derivation**

`admin/src/auth/KeycloakProvider.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const init = vi.fn();
const keycloakMock = {
  init,
  login: vi.fn(),
  logout: vi.fn(),
  updateToken: vi.fn(),
  token: 'a-token',
  tokenParsed: undefined as Record<string, unknown> | undefined,
};

vi.mock('./keycloak', () => ({ default: keycloakMock }));

import { KeycloakProvider } from './KeycloakProvider';
import { useAuth } from './useAuth';

const Probe = () => {
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="admin">{String(isAdmin)}</span>
    </div>
  );
};

const renderProvider = () =>
  render(
    <KeycloakProvider>
      <Probe />
    </KeycloakProvider>
  );

describe('KeycloakProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    keycloakMock.tokenParsed = undefined;
  });

  it('reports admin when the token carries the group', async () => {
    keycloakMock.tokenParsed = { sub: 'u-1', groups: ['/admin'] };
    init.mockResolvedValue(true);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('admin')).toHaveTextContent('true');
  });

  it('reports authenticated but not admin when the group is absent', async () => {
    keycloakMock.tokenParsed = { sub: 'u-2', groups: ['/users'] };
    init.mockResolvedValue(true);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('admin')).toHaveTextContent('false');
  });

  it('stops loading and grants nothing when init rejects', async () => {
    init.mockRejectedValue(new Error('keycloak unreachable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('admin')).toHaveTextContent('false');
  });

  it('requests login-required so an anonymous visitor never sees the shell', async () => {
    keycloakMock.tokenParsed = { sub: 'u-1', groups: ['/admin'] };
    init.mockResolvedValue(true);

    renderProvider();

    await waitFor(() => expect(init).toHaveBeenCalled());
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({ onLoad: 'login-required', pkceMethod: 'S256' })
    );
  });
});
```

- [ ] **Step 8: Run it**

Run: `cd admin && npx vitest run src/auth/KeycloakProvider.test.tsx`
Expected: 4 passed, since the implementation landed in step 6.

- [ ] **Step 9: Write the failing test for `AdminGate`**

`admin/src/auth/AdminGate.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminGate } from './AdminGate';
import { AuthContext, type AuthContextType } from './AuthContext';

const ctx = (overrides: Partial<AuthContextType>): AuthContextType => ({
  isAuthenticated: true,
  isLoading: false,
  isAdmin: false,
  token: 'a-token',
  userId: 'u-1',
  username: 'someone',
  login: vi.fn(),
  logout: vi.fn(),
  keycloak: {} as AuthContextType['keycloak'],
  ...overrides,
});

const renderGate = (overrides: Partial<AuthContextType>) =>
  render(
    <AuthContext.Provider value={ctx(overrides)}>
      <AdminGate>
        <div>admin shell</div>
      </AdminGate>
    </AuthContext.Provider>
  );

describe('AdminGate', () => {
  it('shows a loading state while Keycloak initialises', () => {
    renderGate({ isLoading: true });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('admin shell')).not.toBeInTheDocument();
  });

  it('renders the children for a member of the admin group', () => {
    renderGate({ isAdmin: true });
    expect(screen.getByText('admin shell')).toBeInTheDocument();
  });

  it('refuses a signed-in user outside the group and offers a way out', async () => {
    const logout = vi.fn();
    renderGate({ isAdmin: false, logout });

    expect(screen.queryByText('admin shell')).not.toBeInTheDocument();
    expect(screen.getByText(/not authorised/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('refuses an unauthenticated session too', () => {
    renderGate({ isAuthenticated: false, isAdmin: false });
    expect(screen.queryByText('admin shell')).not.toBeInTheDocument();
    expect(screen.getByText(/not authorised/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Run it to verify it fails**

Run: `cd admin && npx vitest run src/auth/AdminGate.test.tsx`
Expected: FAIL, cannot resolve `./AdminGate`.

- [ ] **Step 11: Write `admin/src/auth/AdminGate.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useAuth } from './useAuth';

/**
 * Renders the application only for a member of the Keycloak admin group.
 *
 * A refused session renders nothing else: no navigation, no queries. Without that,
 * every list in the shell would fire and fail, and a wall of 403 toasts is a much
 * worse answer to "you are not an administrator" than one sentence saying so.
 *
 * This is a user experience guard, not a security control. The backend rejects
 * /v1/admin/** for a non-member regardless of what this component decides.
 */
export const AdminGate = ({ children }: { children: ReactNode }) => {
  const { isLoading, isAdmin, username, logout } = useAuth();

  if (isLoading) {
    return (
      <Box
        role="status"
        aria-label="Signing in"
        sx={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAdmin) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', p: 3 }}>
        <Stack spacing={2} alignItems="center" textAlign="center" maxWidth={420}>
          <Typography variant="h5" component="h1">
            Not authorised
          </Typography>
          <Typography color="text.secondary">
            {username ? `${username} is not` : 'This account is not'} a member of the admin
            group, so the DrinkSaver admin panel is not available. Ask an administrator to add
            you, then sign in again.
          </Typography>
          <Button variant="outlined" onClick={logout}>
            Sign out
          </Button>
        </Stack>
      </Box>
    );
  }

  return <>{children}</>;
};

export default AdminGate;
```

- [ ] **Step 12: Run the whole suite and lint**

Run: `cd admin && npm run lint && npm test`
Expected: all tests pass, lint clean.

- [ ] **Step 13: Commit**

```bash
git add admin/src/auth/
git commit -m "feat(admin): keycloak login and the admin group gate"
```

---

### Task 4: Wire types, axios client and the admin endpoint module

**Files:**
- Create: `admin/src/types/api.ts`, `admin/src/api/client.ts`, `admin/src/api/errors.ts`, `admin/src/api/admin.ts`
- Test: `admin/src/api/errors.test.ts`, `admin/src/api/admin.test.ts`

**Interfaces:**
- Consumes: `config` (Task 2), `keycloak` (Task 3).
- Produces: the types listed in step 1 and every function in step 9, plus `CATALOGUE_PATHS`, `type CatalogueKind` and `interface CatalogueChanges`. Tasks 7 through 11 call these and mock the module with `vi.mock('../../api/admin')`.

- [ ] **Step 1: Write `admin/src/types/api.ts`**

Only the entities the admin panel touches. `AdminOwned` carries the two fields every admin catalogue GET adds.

```ts
// Wire types for the admin API. Only the entities this application touches are
// declared: a change to a web-only type cannot then rot this build, and a change
// to a shared one breaks the admin compile in CI, which is where it should break.

/**
 * What every admin catalogue GET adds to a consumer entity.
 *
 * `userId` is the original author and survives publication, which is what makes
 * unpublish coherent and gives the catalogue table its audit trail. `shared` is the
 * state the publish and unpublish actions toggle; the client never writes either
 * field directly.
 */
export interface AdminOwned {
  userId: string | null;
  shared: boolean;
}

export interface ColorPalette {
  id: number;
  name: string;
  field: string;
  inkLight: string | null;
  inkDark: string;
}

export type NewColorPalette = Omit<ColorPalette, 'id'>;

export interface Glassware {
  id: number;
  name: string;
  g: string;
  l: string;
  f: string | null;
}

export type NewGlassware = Omit<Glassware, 'id'>;

export interface Recommendation {
  id: number;
  name: string;
  alcoholTypeId: number;
  alcoholSubtypeId?: number;
  alcoholVolumeId: number;
  brandId?: number;
  beerFlavourId?: number;
  consumptionTypeId?: number;
  colorPaletteId?: number | null;
  glasswareId?: number | null;
}

export type NewRecommendation = Omit<Recommendation, 'id'>;

/** One entry of the reorder payload. Array order is the order rows end up in. */
export interface RecommendationEdit {
  id: number;
  name: string;
}

export interface AlcoholType extends AdminOwned {
  id: number;
  name: string;
  volumeIds: number[];
  colorPaletteId: number;
  glasswareId: number;
}

export interface AlcoholSubtype extends AdminOwned {
  id: number;
  alcoholTypeId: number;
  name: string;
  colorPaletteId?: number | null;
  glasswareId?: number | null;
}

export interface AlcoholVolume extends AdminOwned {
  id: number;
  name: string;
  volume: number;
}

export interface Brand extends AdminOwned {
  id: number;
  name: string;
  colorPaletteId?: number | null;
}

export interface BeerFlavour extends AdminOwned {
  id: number;
  brandId: number;
  name: string;
  colorPaletteId?: number | null;
}

export interface ConsumptionType extends AdminOwned {
  id: number;
  name: string;
  glasswareId: number;
}
```

- [ ] **Step 2: Write `admin/src/api/client.ts`**

Copied from `web/src/api/client.ts`, retry guard and explanatory comment included, because the failure mode it prevents is identical here.

```ts
import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import keycloak from '../auth/keycloak';
import config from '../config';

const API_BASE_URL = config.apiUrl;

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

apiClient.interceptors.request.use(
  (requestConfig) => {
    if (keycloak.token) {
      requestConfig.headers.Authorization = `Bearer ${keycloak.token}`;
    }
    return requestConfig;
  },
  (error) => Promise.reject(error)
);

/**
 * Marks a request already retried after a 401. The retry goes back through this same
 * interceptor, so without it a 401 the refresh cannot fix retries forever.
 *
 * keycloak-js resolves updateToken(5) with `false`, without contacting Keycloak at
 * all, whenever the local token still has five seconds of validity left. So for any
 * 401 whose cause is not local expiry (a rotated signing key, a revoked session, an
 * audience mismatch, clock skew) the refresh "succeeds", the same token is replayed,
 * and the same 401 comes back with no backoff.
 */
type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const requestConfig = error.config as RetriableConfig | undefined;

    if (error.response?.status === 401 && requestConfig && !requestConfig._retried) {
      requestConfig._retried = true;
      try {
        await keycloak.updateToken(5);
        requestConfig.headers.Authorization = `Bearer ${keycloak.token}`;
        return apiClient.request(requestConfig);
      } catch {
        keycloak.logout();
      }
    } else if (error.response?.status === 401 && requestConfig?._retried) {
      keycloak.logout();
    }

    console.error('API Error:', error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
```

- [ ] **Step 3: Write the failing test for error classification**

`admin/src/api/errors.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { AxiosError } from 'axios';
import { classifyApiError, apiErrorMessage } from './errors';

const axiosErrorWith = (status: number, data?: unknown) => {
  const error = new AxiosError('request failed');
  error.response = { status, data, statusText: '', headers: {}, config: { headers: {} } } as never;
  return error;
};

describe('classifyApiError', () => {
  it('classifies a 403 as forbidden', () => {
    expect(classifyApiError(axiosErrorWith(403))).toBe('forbidden');
  });

  it('classifies a 409 as conflict', () => {
    expect(classifyApiError(axiosErrorWith(409))).toBe('conflict');
  });

  it('classifies a 404 as missing', () => {
    expect(classifyApiError(axiosErrorWith(404))).toBe('missing');
  });

  it('classifies anything else, including a non-axios throw, as unknown', () => {
    expect(classifyApiError(axiosErrorWith(500))).toBe('unknown');
    expect(classifyApiError(new Error('boom'))).toBe('unknown');
    expect(classifyApiError('boom')).toBe('unknown');
  });
});

describe('apiErrorMessage', () => {
  it('explains a conflict in terms of what the admin can do about it', () => {
    expect(apiErrorMessage(axiosErrorWith(409))).toMatch(/still in use/i);
  });

  it('explains a forbidden response without blaming the network', () => {
    expect(apiErrorMessage(axiosErrorWith(403))).toMatch(/not permitted/i);
  });

  it('prefers a server-supplied message when there is one', () => {
    expect(apiErrorMessage(axiosErrorWith(409, { message: 'Referenced by 3 alcohol types' })))
      .toBe('Referenced by 3 alcohol types');
  });

  it('falls back to a retryable message', () => {
    expect(apiErrorMessage(axiosErrorWith(500))).toMatch(/try again/i);
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `cd admin && npx vitest run src/api/errors.test.ts`
Expected: FAIL, cannot resolve `./errors`.

- [ ] **Step 5: Write `admin/src/api/errors.ts`**

```ts
import { AxiosError } from 'axios';

/**
 * Classification for the four API failures this application can say something useful
 * about. Everything else is `unknown` and is reported as retryable.
 *
 * Kept free of React so it can be unit tested on its own, matching web/src/errors.ts.
 */
export type ApiErrorKind = 'forbidden' | 'conflict' | 'missing' | 'unknown';

export const classifyApiError = (error: unknown): ApiErrorKind => {
  if (!(error instanceof AxiosError)) return 'unknown';
  switch (error.response?.status) {
    case 403:
      return 'forbidden';
    case 409:
      return 'conflict';
    case 404:
      return 'missing';
    default:
      return 'unknown';
  }
};

const serverMessage = (error: unknown): string | undefined => {
  if (!(error instanceof AxiosError)) return undefined;
  const data = error.response?.data;
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) return message;
  }
  return undefined;
};

export const apiErrorMessage = (error: unknown): string => {
  const fromServer = serverMessage(error);
  if (fromServer) return fromServer;

  switch (classifyApiError(error)) {
    case 'forbidden':
      return 'That is not permitted for this account.';
    case 'conflict':
      return 'That entry is still in use, so it cannot be removed.';
    case 'missing':
      return 'That entry no longer exists. The list may be out of date.';
    default:
      return 'Something went wrong. Try again.';
  }
};
```

- [ ] **Step 6: Run it to verify it passes**

Run: `cd admin && npx vitest run src/api/errors.test.ts`
Expected: 8 passed.

- [ ] **Step 7: Write the failing test for the endpoint module**

The value of this test is the verb and URL of every call, since those are the contract with a backend that does not exist yet.

`admin/src/api/admin.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();

vi.mock('./client', () => ({
  default: { get, post, patch, delete: del },
}));

import * as api from './admin';

describe('admin endpoint module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ data: [] });
    post.mockResolvedValue({ data: {} });
    patch.mockResolvedValue({ data: {} });
    del.mockResolvedValue({ data: undefined });
  });

  it('reads palettes and glassware from the admin design paths', async () => {
    await api.getColorPalettes();
    expect(get).toHaveBeenCalledWith('/v1/admin/design/color-palettes');

    await api.getGlassware();
    expect(get).toHaveBeenCalledWith('/v1/admin/design/glassware');
  });

  it('creates, updates and deletes a palette on the singular path', async () => {
    const draft = { name: 'Amber', field: '#e8c37e', inkLight: null, inkDark: '#1b1a17' };
    await api.createColorPalette(draft);
    expect(post).toHaveBeenCalledWith('/v1/admin/design/color-palette', draft);

    await api.updateColorPalette(7, { name: 'Amber dark' });
    expect(patch).toHaveBeenCalledWith('/v1/admin/design/color-palette/7', { name: 'Amber dark' });

    await api.deleteColorPalette(7);
    expect(del).toHaveBeenCalledWith('/v1/admin/design/color-palette/7');
  });

  it('creates, updates and deletes glassware on the singular path', async () => {
    const draft = { name: 'Tumbler', g: 'M0 0h10', l: 'M0 0v10', f: null };
    await api.createGlassware(draft);
    expect(post).toHaveBeenCalledWith('/v1/admin/design/glassware', draft);

    await api.updateGlassware(3, { f: 'M1 1h2' });
    expect(patch).toHaveBeenCalledWith('/v1/admin/design/glassware/3', { f: 'M1 1h2' });

    await api.deleteGlassware(3);
    expect(del).toHaveBeenCalledWith('/v1/admin/design/glassware/3');
  });

  it('uses the admin recommendation paths, including a real create', async () => {
    await api.getDefaultRecommendations();
    expect(get).toHaveBeenCalledWith('/v1/admin/recommendations/list');

    const draft = { name: 'House lager', alcoholTypeId: 1, alcoholVolumeId: 2 };
    await api.createDefaultRecommendation(draft);
    expect(post).toHaveBeenCalledWith('/v1/admin/recommendations', draft);

    const edits = [{ id: 2, name: 'B' }, { id: 1, name: 'A' }];
    await api.reorderDefaultRecommendations(edits);
    expect(patch).toHaveBeenCalledWith('/v1/admin/recommendations/edit', edits);

    await api.deleteDefaultRecommendation(9);
    expect(del).toHaveBeenCalledWith('/v1/admin/recommendations/9');
  });

  it('reads every catalogue list from its admin path', async () => {
    await api.getAlcoholTypes();
    expect(get).toHaveBeenCalledWith('/v1/admin/alcohol/types');

    await api.getAlcoholSubtypes(4);
    expect(get).toHaveBeenCalledWith('/v1/admin/alcohol/types/4/subtypes');

    await api.getAlcoholVolumes(4);
    expect(get).toHaveBeenCalledWith('/v1/admin/alcohol/types/4/volumes');

    await api.getBrands();
    expect(get).toHaveBeenCalledWith('/v1/admin/beer/brands');

    await api.getBeerFlavours(5);
    expect(get).toHaveBeenCalledWith('/v1/admin/beer/brands/5/flavours');

    await api.getConsumptionTypes();
    expect(get).toHaveBeenCalledWith('/v1/admin/beer/consumption-types');
  });

  it('patches a catalogue entry on the entity path for its kind', async () => {
    await api.updateCatalogueEntry('alcoholTypes', 4, { name: 'Lager' });
    expect(patch).toHaveBeenCalledWith('/v1/admin/alcohol/types/4', { name: 'Lager' });

    await api.updateCatalogueEntry('flavours', 6, { colorPaletteId: 2 });
    expect(patch).toHaveBeenCalledWith('/v1/admin/beer/flavours/6', { colorPaletteId: 2 });
  });

  it('publishes and unpublishes through the action endpoints with no body', async () => {
    await api.publishCatalogueEntry('brands', 5);
    expect(post).toHaveBeenCalledWith('/v1/admin/beer/brands/5/publish');

    await api.unpublishCatalogueEntry('brands', 5);
    expect(post).toHaveBeenCalledWith('/v1/admin/beer/brands/5/unpublish');
  });

  it('never sends a user id in a publish payload', async () => {
    await api.publishCatalogueEntry('alcoholTypes', 1);
    expect(post).toHaveBeenCalledWith('/v1/admin/alcohol/types/1/publish');
    expect(post).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: expect.anything() })
    );
  });
});
```

- [ ] **Step 8: Run it to verify it fails**

Run: `cd admin && npx vitest run src/api/admin.test.ts`
Expected: FAIL, cannot resolve `./admin`.

- [ ] **Step 9: Write `admin/src/api/admin.ts`**

```ts
/**
 * Every admin endpoint, one function each, no generic resource abstraction.
 *
 * Nothing here sends a user id. The server derives identity from the JWT the request
 * interceptor attaches, and publication is an action endpoint rather than a field, so
 * the client never constructs ownership or sharing state itself.
 *
 * Paths are the contract in docs/superpowers/specs/2026-09-21-admin-panel-design.md
 * section 5. They are asserted in admin.test.ts because the backend implementing them
 * is written separately, and a typo here would otherwise surface as a 404 at runtime.
 */
import apiClient from './client';
import type {
  AlcoholSubtype,
  AlcoholType,
  AlcoholVolume,
  BeerFlavour,
  Brand,
  ColorPalette,
  ConsumptionType,
  Glassware,
  NewColorPalette,
  NewGlassware,
  NewRecommendation,
  Recommendation,
  RecommendationEdit,
} from '../types/api';

// Design: color palettes
export const getColorPalettes = async (): Promise<ColorPalette[]> =>
  (await apiClient.get<ColorPalette[]>('/v1/admin/design/color-palettes')).data;

export const createColorPalette = async (draft: NewColorPalette): Promise<ColorPalette> =>
  (await apiClient.post<ColorPalette>('/v1/admin/design/color-palette', draft)).data;

export const updateColorPalette = async (
  id: number,
  changes: Partial<NewColorPalette>
): Promise<ColorPalette> =>
  (await apiClient.patch<ColorPalette>(`/v1/admin/design/color-palette/${id}`, changes)).data;

export const deleteColorPalette = async (id: number): Promise<void> => {
  await apiClient.delete(`/v1/admin/design/color-palette/${id}`);
};

// Design: glassware
export const getGlassware = async (): Promise<Glassware[]> =>
  (await apiClient.get<Glassware[]>('/v1/admin/design/glassware')).data;

export const createGlassware = async (draft: NewGlassware): Promise<Glassware> =>
  (await apiClient.post<Glassware>('/v1/admin/design/glassware', draft)).data;

export const updateGlassware = async (
  id: number,
  changes: Partial<NewGlassware>
): Promise<Glassware> =>
  (await apiClient.patch<Glassware>(`/v1/admin/design/glassware/${id}`, changes)).data;

export const deleteGlassware = async (id: number): Promise<void> => {
  await apiClient.delete(`/v1/admin/design/glassware/${id}`);
};

// Default recommendations
export const getDefaultRecommendations = async (): Promise<Recommendation[]> =>
  (await apiClient.get<Recommendation[]>('/v1/admin/recommendations/list')).data;

export const createDefaultRecommendation = async (
  draft: NewRecommendation
): Promise<Recommendation> =>
  (await apiClient.post<Recommendation>('/v1/admin/recommendations', draft)).data;

/**
 * Rewrites the default list: every surviving row's name, in the order they should be
 * shown. Deleted rows are simply absent, so pending deletes must be flushed before
 * this is called, or the server is told an order that omits a row.
 */
export const reorderDefaultRecommendations = async (
  edits: readonly RecommendationEdit[]
): Promise<Recommendation[]> =>
  (await apiClient.patch<Recommendation[]>('/v1/admin/recommendations/edit', edits)).data;

export const deleteDefaultRecommendation = async (id: number): Promise<void> => {
  await apiClient.delete(`/v1/admin/recommendations/${id}`);
};

// Catalogue reads
export const getAlcoholTypes = async (): Promise<AlcoholType[]> =>
  (await apiClient.get<AlcoholType[]>('/v1/admin/alcohol/types')).data;

export const getAlcoholSubtypes = async (alcoholTypeId: number): Promise<AlcoholSubtype[]> =>
  (await apiClient.get<AlcoholSubtype[]>(`/v1/admin/alcohol/types/${alcoholTypeId}/subtypes`)).data;

export const getAlcoholVolumes = async (alcoholTypeId: number): Promise<AlcoholVolume[]> =>
  (await apiClient.get<AlcoholVolume[]>(`/v1/admin/alcohol/types/${alcoholTypeId}/volumes`)).data;

export const getBrands = async (): Promise<Brand[]> =>
  (await apiClient.get<Brand[]>('/v1/admin/beer/brands')).data;

export const getBeerFlavours = async (brandId: number): Promise<BeerFlavour[]> =>
  (await apiClient.get<BeerFlavour[]>(`/v1/admin/beer/brands/${brandId}/flavours`)).data;

export const getConsumptionTypes = async (): Promise<ConsumptionType[]> =>
  (await apiClient.get<ConsumptionType[]>('/v1/admin/beer/consumption-types')).data;

/**
 * The six catalogue kinds and the single-entity path each one patches. One map rather
 * than six near-identical functions, because the only thing that varies is the path
 * segment, and a table rendering all six needs to address them by a key anyway.
 */
export const CATALOGUE_PATHS = {
  alcoholTypes: 'alcohol/types',
  subtypes: 'alcohol/subtypes',
  volumes: 'alcohol/volumes',
  brands: 'beer/brands',
  flavours: 'beer/flavours',
  consumptionTypes: 'beer/consumption-types',
} as const;

export type CatalogueKind = keyof typeof CATALOGUE_PATHS;

export interface CatalogueChanges {
  name?: string;
  colorPaletteId?: number | null;
  glasswareId?: number | null;
}

export const updateCatalogueEntry = async (
  kind: CatalogueKind,
  id: number,
  changes: CatalogueChanges
): Promise<void> => {
  await apiClient.patch(`/v1/admin/${CATALOGUE_PATHS[kind]}/${id}`, changes);
};

export const publishCatalogueEntry = async (kind: CatalogueKind, id: number): Promise<void> => {
  await apiClient.post(`/v1/admin/${CATALOGUE_PATHS[kind]}/${id}/publish`);
};

export const unpublishCatalogueEntry = async (kind: CatalogueKind, id: number): Promise<void> => {
  await apiClient.post(`/v1/admin/${CATALOGUE_PATHS[kind]}/${id}/unpublish`);
};
```

- [ ] **Step 10: Run the suite and lint**

Run: `cd admin && npm run lint && npm test`
Expected: all green.

- [ ] **Step 11: Commit**

```bash
git add admin/src/types/ admin/src/api/
git commit -m "feat(admin): wire types, axios client and the admin endpoint module"
```

---

### Task 5: Theme, copied from the consumer app

**Files:**
- Copy from `web/src/theme/`: `primitives.ts`, `tokens.ts`, `cssVars.ts` into `admin/src/theme/`
- Create: `admin/src/theme/fonts.css`, `admin/src/theme/muiTheme.ts`, `admin/src/theme/AdminThemeProvider.tsx`
- Modify: `admin/src/index.css`
- Test: `admin/src/theme/muiTheme.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `darkTokens`, `lightTokens`, `type ThemeTokens` from `theme/tokens.ts` (copied)
  - `toCssVars`, `applyCssVars` from `theme/cssVars.ts` (copied)
  - `adminTheme(): Theme` from `theme/muiTheme.ts`
  - `AdminThemeProvider` from `theme/AdminThemeProvider.tsx`, which Task 6 wraps the shell in
- The custom property names every later task reads come from the copied files, not from anything
  written here. The ones used in this plan are `--ds-surface-ground`, `--ds-surface-raised`,
  `--ds-surface-panel`, `--ds-ink-primary`, `--ds-ink-secondary`, `--ds-line-hairline` and
  `--ds-accent-primary`.

The palette editor previews a colour against the surfaces a real user sees. That is only true if
the surfaces are the same objects, not a parallel set that happens to look similar today. So the
token files are copied verbatim rather than rewritten, and the admin register lives entirely in
the MUI theme on top of them: small controls, tight cells, no elevation.

- [ ] **Step 1: Copy the three token files unchanged**

```bash
cd /Users/alexmolnar/personal/sandbox/adminpaneler
mkdir -p admin/src/theme
cp web/src/theme/primitives.ts web/src/theme/tokens.ts web/src/theme/cssVars.ts admin/src/theme/
cp web/src/theme/cssVars.test.ts web/src/theme/tokens.test.ts admin/src/theme/
```

Copy the tests too. They are the proof that the copy is intact, and they cost nothing to keep
green. Do not edit any of the five files: a diff against `web/src/theme/` is what tells a future
reader the two are still the same, and `docs/remaining-work.md` records the duplication (Task 14).

- [ ] **Step 2: Confirm the copies are byte-identical and their tests pass**

```bash
cd /Users/alexmolnar/personal/sandbox/adminpaneler
for f in primitives.ts tokens.ts cssVars.ts; do diff -q "web/src/theme/$f" "admin/src/theme/$f"; done
cd admin && npx vitest run src/theme
```

Expected: `diff` prints nothing for all three, and the copied tests pass. If a copied test imports
something outside `src/theme/`, copy that too or stop and reconsider: a token file reaching into
the rest of the web app is a sign this cannot be a clean copy.

- [ ] **Step 3: Write `admin/src/theme/fonts.css`**

```css
@import '@fontsource-variable/fraunces';
@import '@fontsource-variable/familjen-grotesk';
```

- [ ] **Step 4: Write the failing test for the MUI theme**

`admin/src/theme/muiTheme.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { adminTheme } from './muiTheme';
import { toCssVars } from './cssVars';
import { darkTokens } from './tokens';

describe('adminTheme', () => {
  it('reads its palette from the shared custom properties, not from MUI defaults', () => {
    const theme = adminTheme();
    expect(theme.palette.background.default).toBe('var(--ds-surface-ground)');
    expect(theme.palette.background.paper).toBe('var(--ds-surface-raised)');
    expect(theme.palette.text.primary).toBe('var(--ds-ink-primary)');
    expect(theme.palette.divider).toBe('var(--ds-line-hairline)');
  });

  it('only names custom properties the token files actually define', () => {
    const defined = new Set(Object.keys(toCssVars(darkTokens)));
    const used = JSON.stringify(adminTheme()).match(/--ds-[a-z0-9-]+/g) ?? [];
    expect(used.length).toBeGreaterThan(0);
    for (const name of used) {
      expect(defined).toContain(name);
    }
  });

  it('places the md breakpoint at 900, which is where the rail collapses', () => {
    expect(adminTheme().breakpoints.values.md).toBe(900);
  });

  it('is denser than the consumer app: small controls by default', () => {
    const theme = adminTheme();
    expect(theme.components?.MuiTextField?.defaultProps?.size).toBe('small');
    expect(theme.components?.MuiTable?.defaultProps?.size).toBe('small');
  });
});
```

The second test is the one that matters. It is what stops this plan's invented names from coming
back: any `var(--ds-*)` in the theme that the copied token files do not define fails the suite.

- [ ] **Step 5: Run it to verify it fails**

Run: `cd admin && npx vitest run src/theme/muiTheme.test.ts`
Expected: FAIL, cannot resolve `./muiTheme`.

- [ ] **Step 6: Write `admin/src/theme/muiTheme.ts`**

```ts
import { createTheme, type Theme } from '@mui/material/styles';

const BODY = "'Familjen Grotesk Variable', system-ui, sans-serif";
const DISPLAY = "'Fraunces Variable', Georgia, serif";

/**
 * The admin register, built on the consumer app's tokens.
 *
 * Every colour is a custom property defined by the copied theme/tokens.ts, so a palette
 * previewed here sits on the same surfaces a real user sees. muiTheme.test.ts asserts that
 * every name used below is one the token files actually define, which is what keeps a
 * plausible-looking but non-existent variable from silently rendering as nothing.
 *
 * What differs from the consumer app is density, not colour: small controls, tight table
 * cells, flat surfaces. A curation tool shows more rows per screen than a phone shows drinks.
 *
 * Dark only. The consumer app offers both modes because a phone is used in a bar at midnight
 * and on a terrace at noon; this is used at a desk. The palette editor renders both modes
 * side by side regardless, which is the one place both are needed.
 */
export const adminTheme = (): Theme =>
  createTheme({
    breakpoints: {
      values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
    },
    palette: {
      mode: 'dark',
      background: {
        default: 'var(--ds-surface-ground)',
        paper: 'var(--ds-surface-raised)',
      },
      text: {
        primary: 'var(--ds-ink-primary)',
        secondary: 'var(--ds-ink-secondary)',
      },
      divider: 'var(--ds-line-hairline)',
      primary: {
        main: 'var(--ds-accent-primary)',
        contrastText: 'var(--ds-ink-on-accent)',
      },
    },
    shape: { borderRadius: 6 },
    typography: {
      fontFamily: BODY,
      h1: { fontFamily: DISPLAY, fontSize: '1.75rem', fontWeight: 700 },
      h2: { fontFamily: DISPLAY, fontSize: '1.375rem', fontWeight: 700 },
      h3: { fontFamily: DISPLAY, fontSize: '1.125rem', fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiTextField: { defaultProps: { size: 'small', variant: 'outlined' } },
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiTable: { defaultProps: { size: 'small' } },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { border: '1px solid var(--ds-line-hairline)' } },
      },
    },
  });

export default adminTheme;
```

If the second test fails on `--ds-ink-on-accent`, the copied `tokens.ts` names that leaf
differently. Read `toCssVars(darkTokens)` and use the name it actually produces rather than
adding the leaf to the copied file, which would break the byte-identical check from step 2.

- [ ] **Step 7: Write `admin/src/theme/AdminThemeProvider.tsx`**

```tsx
import { useEffect, type ReactNode } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { adminTheme } from './muiTheme';
import { applyCssVars } from './cssVars';
import { darkTokens } from './tokens';

const theme = adminTheme();

/**
 * Applies the shared custom properties to the document, then MUI's theme on top.
 *
 * applyCssVars is the same function the consumer app uses, so the two cannot drift in how a
 * token reaches the DOM. The theme object is created once at module scope: it has no inputs,
 * so rebuilding it per render would allocate for nothing.
 */
export const AdminThemeProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    applyCssVars(document.documentElement, darkTokens);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

export default AdminThemeProvider;
```

- [ ] **Step 8: Update `admin/src/index.css`**

The provider applies the full token set once React mounts. This file carries only what has to
paint before that, so the first frame is not a white flash:

```css
@import './theme/fonts.css';

:root {
  /* The provider applies the full token set from theme/tokens.ts on mount. These two are
     duplicated here because they paint before React runs, and a white first frame on a dark
     application is worse than one duplicated pair. Keep them in step with darkTokens.surface
     .ground and darkTokens.ink.primary. */
  --ds-surface-ground: #191712;
  --ds-ink-primary: #f2ece1;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  color-scheme: dark;
}

html,
body,
#root {
  height: 100%;
  margin: 0;
  background: var(--ds-surface-ground);
  color: var(--ds-ink-primary);
}
```

Read the real values out of the copied `primitives.ts` (`umber.ground` and `ink.primary`) and
use those, not the two above, which are illustrative.

- [ ] **Step 9: Run the theme tests, lint and build**

Run: `cd admin && npx vitest run src/theme && npm run lint && npm run build`
Expected: the copied tests and the four new ones pass, lint clean, build succeeds.

- [ ] **Step 10: Commit**

```bash
git add admin/src/theme/ admin/src/index.css
git commit -m "feat(admin): theme built on the consumer app's token files"
```

---

### Task 6: Section registry, shell and routing

**Files:**
- Create: `admin/src/sections/types.ts`, `admin/src/sections/registry.tsx`, `admin/src/components/AdminShell.tsx`, `admin/src/App.tsx`
- Modify: `admin/src/main.tsx`
- Test: `admin/src/sections/registry.test.ts`, `admin/src/components/AdminShell.test.tsx`, `admin/src/App.test.tsx`

**Interfaces:**
- Consumes: `KeycloakProvider`, `AdminGate` (Task 3), `AdminThemeProvider` (Task 5).
- Produces:
  - `interface SectionDescriptor { id: string; label: string; icon: ReactNode; path: string; element: ReactNode }` from `sections/types.ts`
  - `SECTIONS: SectionDescriptor[]` from `sections/registry.tsx`
  - `AdminShell` from `components/AdminShell.tsx`
  - Tasks 8 through 11 each add one entry to `SECTIONS` and nothing else to wire themselves up.

- [ ] **Step 1: Write the failing test for the registry**

This test is the contract that makes the registry worth having. If it passes, adding a section
is one line.

`admin/src/sections/registry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SECTIONS } from './registry';

describe('section registry', () => {
  it('is not empty', () => {
    expect(SECTIONS.length).toBeGreaterThan(0);
  });

  it('gives every section a unique id and a unique path', () => {
    const ids = SECTIONS.map((section) => section.id);
    const paths = SECTIONS.map((section) => section.path);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('uses absolute paths, so the rail can link to them directly', () => {
    for (const section of SECTIONS) {
      expect(section.path.startsWith('/')).toBe(true);
    }
  });

  it('gives every section a human label and an element to render', () => {
    for (const section of SECTIONS) {
      expect(section.label.trim().length).toBeGreaterThan(0);
      expect(section.element).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd admin && npx vitest run src/sections/registry.test.ts`
Expected: FAIL, cannot resolve `./registry`.

- [ ] **Step 3: Write `admin/src/sections/types.ts` and a placeholder `registry.tsx`**

`admin/src/sections/types.ts`:

```ts
import type { ReactNode } from 'react';

/**
 * One admin area.
 *
 * The rail and the router both derive from an array of these, so adding an area is one
 * folder and one line in registry.tsx. That is the whole of what "ready for more admin
 * features" requires here: no plugin system, no dynamic imports, no manifest.
 */
export interface SectionDescriptor {
  /** Stable key, used for React keys and for test selection. */
  id: string;
  /** What the rail shows. */
  label: string;
  icon: ReactNode;
  /** Absolute route path, so the rail can link to it without composing. */
  path: string;
  element: ReactNode;
}
```

`admin/src/sections/registry.tsx`, which holds JSX so it carries the `.tsx` extension. Each
later task replaces one placeholder element with its
real section and leaves the rest of this file alone:

```tsx
import PaletteIcon from '@mui/icons-material/Palette';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import StarIcon from '@mui/icons-material/Star';
import InventoryIcon from '@mui/icons-material/Inventory2';
import type { SectionDescriptor } from './types';

/**
 * Every admin area, in rail order.
 *
 * Task ordering note: the elements below are placeholders until their own task lands.
 * A placeholder renders its own name so a half-built shell is navigable rather than
 * blank, which keeps each task independently reviewable.
 */
export const SECTIONS: SectionDescriptor[] = [
  {
    id: 'palettes',
    label: 'Colour palettes',
    icon: <PaletteIcon fontSize="small" />,
    path: '/design/palettes',
    element: <div>Colour palettes</div>,
  },
  {
    id: 'glassware',
    label: 'Glassware',
    icon: <LocalBarIcon fontSize="small" />,
    path: '/design/glassware',
    element: <div>Glassware</div>,
  },
  {
    id: 'recommendations',
    label: 'Default recommendations',
    icon: <StarIcon fontSize="small" />,
    path: '/recommendations',
    element: <div>Default recommendations</div>,
  },
  {
    id: 'catalogue',
    label: 'Catalogue',
    icon: <InventoryIcon fontSize="small" />,
    path: '/catalogue',
    element: <div>Catalogue</div>,
  },
];

export default SECTIONS;
```

Keep `types.ts` as `.ts`: it declares an interface and nothing else. The test imports
`./registry`, and the extension resolves either way.

- [ ] **Step 4: Run it to verify it passes**

Run: `cd admin && npx vitest run src/sections/registry.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Write the failing test for the shell**

`admin/src/components/AdminShell.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AdminShell } from './AdminShell';
import { AuthContext, type AuthContextType } from '../auth/AuthContext';

const auth = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
  isAuthenticated: true,
  isLoading: false,
  isAdmin: true,
  token: 'a-token',
  userId: 'u-1',
  username: 'curator',
  login: vi.fn(),
  logout: vi.fn(),
  keycloak: {} as AuthContextType['keycloak'],
  ...overrides,
});

const setViewport = (width: number) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    // MUI's useMediaQuery asks for min-width: 900px for the md breakpoint up.
    matches: query.includes('min-width') && width >= 900,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

const renderShell = (overrides: Partial<AuthContextType> = {}) =>
  render(
    <AuthContext.Provider value={auth(overrides)}>
      <MemoryRouter initialEntries={['/design/palettes']}>
        <AdminShell>
          <div>section content</div>
        </AdminShell>
      </MemoryRouter>
    </AuthContext.Provider>
  );

describe('AdminShell', () => {
  beforeEach(() => {
    setViewport(1280);
  });

  it('renders a navigation link per registered section', () => {
    renderShell();
    const nav = screen.getByRole('navigation', { name: /admin sections/i });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /colour palettes/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /glassware/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /default recommendations/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /catalogue/i })).toBeInTheDocument();
  });

  it('marks the link for the current route as current', () => {
    renderShell();
    expect(screen.getByRole('link', { name: /colour palettes/i })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('renders the section content', () => {
    renderShell();
    expect(screen.getByText('section content')).toBeInTheDocument();
  });

  it('shows the signed-in username and a sign-out control', async () => {
    const logout = vi.fn();
    renderShell({ logout });
    expect(screen.getByText('curator')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('hides the rail behind a menu button below the md breakpoint', async () => {
    setViewport(500);
    renderShell();

    expect(screen.queryByRole('navigation', { name: /admin sections/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /open navigation/i }));
    expect(screen.getByRole('navigation', { name: /admin sections/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `cd admin && npx vitest run src/components/AdminShell.test.tsx`
Expected: FAIL, cannot resolve `./AdminShell`.

- [ ] **Step 7: Write `admin/src/components/AdminShell.tsx`**

```tsx
import { useState, type ReactNode } from 'react';
import {
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { NavLink, useLocation } from 'react-router-dom';
import { SECTIONS } from '../sections/registry';
import { useAuth } from '../auth/useAuth';

const RAIL_WIDTH = 248;

/**
 * The application frame: a persistent rail on a desktop, a temporary drawer below the
 * md breakpoint.
 *
 * Navigation is derived from SECTIONS rather than written out, which is what makes a
 * new admin area one line of registry rather than an edit in three files that is easy
 * to do in two of them.
 */
const SectionNav = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { pathname } = useLocation();
  return (
    <List component="nav" aria-label="Admin sections" sx={{ py: 1 }}>
      {SECTIONS.map((section) => {
        const current = pathname.startsWith(section.path);
        return (
          <ListItemButton
            key={section.id}
            component={NavLink}
            to={section.path}
            selected={current}
            aria-current={current ? 'page' : undefined}
            onClick={onNavigate}
            sx={{ borderRadius: 1, mx: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{section.icon}</ListItemIcon>
            <ListItemText primary={section.label} />
          </ListItemButton>
        );
      })}
    </List>
  );
};

export const AdminShell = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { username, logout } = useAuth();

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      {isDesktop ? (
        <Box
          component="aside"
          sx={{
            width: RAIL_WIDTH,
            flexShrink: 0,
            borderRight: '1px solid var(--ds-line-hairline)',
            bgcolor: 'var(--ds-surface-raised)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ px: 3, py: 2.5 }}>
            <Typography variant="h3" component="p">
              DrinkSaver
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Admin
            </Typography>
          </Box>
          <SectionNav />
          <Box sx={{ mt: 'auto', p: 2, borderTop: '1px solid var(--ds-line-hairline)' }}>
            <Typography variant="body2" noWrap>
              {username}
            </Typography>
            <Button size="small" onClick={logout} sx={{ mt: 1 }}>
              Sign out
            </Button>
          </Box>
        </Box>
      ) : (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <Box sx={{ width: RAIL_WIDTH }}>
            <SectionNav onNavigate={() => setDrawerOpen(false)} />
          </Box>
        </Drawer>
      )}

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {!isDesktop && (
          <AppBar
            position="sticky"
            color="transparent"
            sx={{ borderBottom: '1px solid var(--ds-line-hairline)', bgcolor: 'var(--ds-surface-raised)' }}
          >
            <Toolbar>
              <IconButton
                edge="start"
                aria-label="Open navigation"
                onClick={() => setDrawerOpen(true)}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h3" component="p" sx={{ ml: 1, flex: 1 }}>
                DrinkSaver Admin
              </Typography>
              <Button size="small" onClick={logout}>
                Sign out
              </Button>
            </Toolbar>
          </AppBar>
        )}
        <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 4 }, minWidth: 0 }}>
          {!isDesktop && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {username}
            </Typography>
          )}
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AdminShell;
```

- [ ] **Step 8: Run it to verify it passes**

Run: `cd admin && npx vitest run src/components/AdminShell.test.tsx`
Expected: 5 passed.

- [ ] **Step 9: Write the failing test for `App`**

`admin/src/App.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('./auth/KeycloakProvider', () => ({
  KeycloakProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('./auth/AdminGate', () => ({
  AdminGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('./auth/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    isAdmin: true,
    token: 't',
    userId: 'u-1',
    username: 'curator',
    login: vi.fn(),
    logout: vi.fn(),
    keycloak: {},
  }),
}));

import App from './App';

describe('App', () => {
  it('redirects the root path to the first registered section', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(await screen.findByText('Colour palettes')).toBeInTheDocument();
  });

  it('renders a not-found message for an unknown route', async () => {
    window.history.pushState({}, '', '/nope');
    render(<App />);
    expect(await screen.findByText(/page not found/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Run it to verify it fails**

Run: `cd admin && npx vitest run src/App.test.tsx`
Expected: FAIL, cannot resolve `./App`.

- [ ] **Step 11: Write `admin/src/App.tsx` and update `admin/src/main.tsx`**

`admin/src/App.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Typography } from '@mui/material';
import { KeycloakProvider } from './auth/KeycloakProvider';
import { AdminGate } from './auth/AdminGate';
import { AdminThemeProvider } from './theme/AdminThemeProvider';
import { AdminShell } from './components/AdminShell';
import { SECTIONS } from './sections/registry';

/**
 * One QueryClient for the application. Retries are left at the default for reads and
 * turned off for mutations: retrying a failed PATCH against a list an administrator is
 * looking at is a good way to apply a change twice.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

export const App = () => (
  <AdminThemeProvider>
    <KeycloakProvider>
      <AdminGate>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AdminShell>
              <Routes>
                <Route path="/" element={<Navigate to={SECTIONS[0].path} replace />} />
                {SECTIONS.map((section) => (
                  <Route key={section.id} path={section.path} element={section.element} />
                ))}
                <Route path="*" element={<Typography>Page not found.</Typography>} />
              </Routes>
            </AdminShell>
          </BrowserRouter>
        </QueryClientProvider>
      </AdminGate>
    </KeycloakProvider>
  </AdminThemeProvider>
);

export default App;
```

`admin/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 12: Run the whole suite, lint and build**

Run: `cd admin && npm run lint && npm test && npm run build`
Expected: all green. If `react-refresh/only-export-components` complains about
`registry.tsx` exporting a non-component, that is expected for a data module; add
`/* eslint-disable react-refresh/only-export-components */` at the top of `registry.tsx` with a
one-line comment saying it is a data module, not a component module.

- [ ] **Step 13: Commit**

```bash
git add admin/src/sections/ admin/src/components/AdminShell.tsx admin/src/App.tsx admin/src/main.tsx admin/src/App.test.tsx admin/src/components/AdminShell.test.tsx
git commit -m "feat(admin): section registry, shell and routing"
```

---

### Task 7: Shared query hooks, usage counts and the responsive table

**Files:**
- Create: `admin/src/api/queries.ts`, `admin/src/usageCounts.ts`, `admin/src/components/ResponsiveTable.tsx`, `admin/src/components/ConfirmDialog.tsx`, `admin/src/test/test-utils.tsx`
- Test: `admin/src/usageCounts.test.ts`, `admin/src/components/ResponsiveTable.test.tsx`, `admin/src/components/ConfirmDialog.test.tsx`

**Interfaces:**
- Consumes: `api/admin.ts` (Task 4), the theme (Task 5).
- Produces:
  - `queryKeys` and the hooks `usePalettes()`, `useGlassware()`, `useDefaultRecommendations()`, `useAlcoholTypes()`, `useBrands()`, `useConsumptionTypes()` from `api/queries.ts`
  - `designUsage(input): UsageCounts` from `usageCounts.ts`, where
    `interface UsageCounts { palettes: Map<number, number>; glassware: Map<number, number> }`
  - `ResponsiveTable<T>` from `components/ResponsiveTable.tsx`
  - `ConfirmDialog` from `components/ConfirmDialog.tsx`
  - `renderWithProviders` from `test/test-utils.tsx`
  - Tasks 8 through 11 use all of these.

- [ ] **Step 1: Write the failing test for usage counts**

`admin/src/usageCounts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { designUsage } from './usageCounts';

const owned = { userId: 'u-1', shared: false };

describe('designUsage', () => {
  it('counts every reference to a palette across the catalogue', () => {
    const usage = designUsage({
      alcoholTypes: [
        { ...owned, id: 1, name: 'Lager', volumeIds: [], colorPaletteId: 10, glasswareId: 20 },
        { ...owned, id: 2, name: 'Stout', volumeIds: [], colorPaletteId: 10, glasswareId: 21 },
      ],
      brands: [{ ...owned, id: 3, name: 'Acme', colorPaletteId: 10 }],
      consumptionTypes: [{ ...owned, id: 4, name: 'Pint', glasswareId: 20 }],
    });

    expect(usage.palettes.get(10)).toBe(3);
    expect(usage.glassware.get(20)).toBe(2);
    expect(usage.glassware.get(21)).toBe(1);
  });

  it('reports zero for an unreferenced id rather than undefined', () => {
    const usage = designUsage({ alcoholTypes: [], brands: [], consumptionTypes: [] });
    expect(usage.palettes.get(99) ?? 0).toBe(0);
  });

  it('ignores null and undefined assignments', () => {
    const usage = designUsage({
      alcoholTypes: [],
      brands: [
        { ...owned, id: 1, name: 'No palette', colorPaletteId: null },
        { ...owned, id: 2, name: 'Undefined palette' },
      ],
      consumptionTypes: [],
    });
    expect(usage.palettes.size).toBe(0);
  });

  it('tolerates a list that has not loaded yet', () => {
    const usage = designUsage({});
    expect(usage.palettes.size).toBe(0);
    expect(usage.glassware.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd admin && npx vitest run src/usageCounts.test.ts`
Expected: FAIL, cannot resolve `./usageCounts`.

- [ ] **Step 3: Write `admin/src/usageCounts.ts`**

```ts
import type { AlcoholType, Brand, ConsumptionType } from './types/api';

export interface UsageCounts {
  palettes: Map<number, number>;
  glassware: Map<number, number>;
}

interface UsageInput {
  alcoholTypes?: AlcoholType[];
  brands?: Brand[];
  consumptionTypes?: ConsumptionType[];
}

/**
 * How many reference-data rows point at each palette and each glassware.
 *
 * This is deliberately partial. Saved drinks also carry design overrides, and no admin
 * endpoint exposes them, so the count answers "referenced by reference data" and the
 * UI labels it exactly that way. The 409 from a DELETE remains the authority; this
 * count exists to disable a button before an administrator clicks it, not to decide
 * whether a row can be removed.
 *
 * Pure, so the rule can be tested without rendering anything.
 */
export const designUsage = ({
  alcoholTypes = [],
  brands = [],
  consumptionTypes = [],
}: UsageInput): UsageCounts => {
  const palettes = new Map<number, number>();
  const glassware = new Map<number, number>();

  const count = (map: Map<number, number>, id: number | null | undefined) => {
    if (typeof id !== 'number') return;
    map.set(id, (map.get(id) ?? 0) + 1);
  };

  for (const type of alcoholTypes) {
    count(palettes, type.colorPaletteId);
    count(glassware, type.glasswareId);
  }
  for (const brand of brands) {
    count(palettes, brand.colorPaletteId);
  }
  for (const consumptionType of consumptionTypes) {
    count(glassware, consumptionType.glasswareId);
  }

  return { palettes, glassware };
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd admin && npx vitest run src/usageCounts.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Write `admin/src/api/queries.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import {
  getAlcoholTypes,
  getBrands,
  getColorPalettes,
  getConsumptionTypes,
  getDefaultRecommendations,
  getGlassware,
} from './admin';

/**
 * One place for every query key, so an invalidation in a mutation cannot drift from the
 * key the list was fetched under. That drift is silent: the mutation succeeds, the list
 * keeps showing the old row, and nothing logs anything.
 */
export const queryKeys = {
  palettes: ['admin', 'palettes'] as const,
  glassware: ['admin', 'glassware'] as const,
  recommendations: ['admin', 'recommendations'] as const,
  alcoholTypes: ['admin', 'alcoholTypes'] as const,
  subtypes: (alcoholTypeId: number) => ['admin', 'subtypes', alcoholTypeId] as const,
  volumes: (alcoholTypeId: number) => ['admin', 'volumes', alcoholTypeId] as const,
  brands: ['admin', 'brands'] as const,
  flavours: (brandId: number) => ['admin', 'flavours', brandId] as const,
  consumptionTypes: ['admin', 'consumptionTypes'] as const,
};

export const usePalettes = () =>
  useQuery({ queryKey: queryKeys.palettes, queryFn: getColorPalettes });

export const useGlassware = () =>
  useQuery({ queryKey: queryKeys.glassware, queryFn: getGlassware });

export const useDefaultRecommendations = () =>
  useQuery({ queryKey: queryKeys.recommendations, queryFn: getDefaultRecommendations });

export const useAlcoholTypes = () =>
  useQuery({ queryKey: queryKeys.alcoholTypes, queryFn: getAlcoholTypes });

export const useBrands = () => useQuery({ queryKey: queryKeys.brands, queryFn: getBrands });

export const useConsumptionTypes = () =>
  useQuery({ queryKey: queryKeys.consumptionTypes, queryFn: getConsumptionTypes });
```

- [ ] **Step 6: Write `admin/src/test/test-utils.tsx`**

```tsx
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render, type RenderOptions } from '@testing-library/react';
import { AdminThemeProvider } from '../theme/AdminThemeProvider';

/**
 * A fresh QueryClient per render, with retries off. Retries make a failing query take
 * seconds and turn an assertion failure into a timeout.
 */
export const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

interface Options extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

export const renderWithProviders = (
  ui: ReactElement,
  { route = '/', ...options }: Options = {}
) => {
  const client = makeQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AdminThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    </AdminThemeProvider>
  );
  return { client, ...render(ui, { wrapper: Wrapper, ...options }) };
};
```

- [ ] **Step 7: Write the failing test for `ResponsiveTable`**

`admin/src/components/ResponsiveTable.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { ResponsiveTable } from './ResponsiveTable';

interface Row {
  id: number;
  name: string;
  count: number;
}

const rows: Row[] = [
  { id: 1, name: 'Amber', count: 3 },
  { id: 2, name: 'Slate', count: 0 },
];

const columns = [
  { id: 'name', label: 'Name', render: (row: Row) => row.name },
  { id: 'count', label: 'In use', render: (row: Row) => String(row.count) },
];

const setViewport = (width: number) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('min-width') && width >= 900,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

describe('ResponsiveTable', () => {
  beforeEach(() => setViewport(1280));

  it('renders a real table on a desktop', () => {
    renderWithProviders(
      <ResponsiveTable caption="Palettes" rows={rows} columns={columns} rowKey={(row) => row.id} />
    );
    expect(screen.getByRole('table', { name: 'Palettes' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByText('Amber')).toBeInTheDocument();
  });

  it('renders stacked cards below the md breakpoint, with the column label beside each value', () => {
    setViewport(500);
    renderWithProviders(
      <ResponsiveTable caption="Palettes" rows={rows} columns={columns} rowKey={(row) => row.id} />
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('Amber')).toBeInTheDocument();
    expect(screen.getAllByText('In use')).toHaveLength(2);
  });

  it('shows the empty message instead of an empty frame', () => {
    renderWithProviders(
      <ResponsiveTable
        caption="Palettes"
        rows={[]}
        columns={columns}
        rowKey={(row: Row) => row.id}
        empty="No palettes yet."
      />
    );
    expect(screen.getByText('No palettes yet.')).toBeInTheDocument();
  });

  it('shows a loading state that is announced', () => {
    renderWithProviders(
      <ResponsiveTable
        caption="Palettes"
        rows={[]}
        columns={columns}
        rowKey={(row: Row) => row.id}
        isLoading
      />
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows an error message instead of an empty list when the query failed', () => {
    renderWithProviders(
      <ResponsiveTable
        caption="Palettes"
        rows={[]}
        columns={columns}
        rowKey={(row: Row) => row.id}
        error="That is not permitted for this account."
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/not permitted/i);
  });
});
```

- [ ] **Step 8: Run it to verify it fails**

Run: `cd admin && npx vitest run src/components/ResponsiveTable.test.tsx`
Expected: FAIL, cannot resolve `./ResponsiveTable`.

- [ ] **Step 9: Write `admin/src/components/ResponsiveTable.tsx`**

```tsx
import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

export interface Column<T> {
  id: string;
  label: string;
  render: (row: T) => ReactNode;
  /** Right-aligned on a desktop. Used for counts and action columns. */
  align?: 'left' | 'right';
}

interface Props<T> {
  /** Accessible name for the table, and the heading of the card list on mobile. */
  caption: string;
  rows: readonly T[];
  columns: readonly Column<T>[];
  rowKey: (row: T) => string | number;
  empty?: string;
  isLoading?: boolean;
  error?: string;
}

/**
 * One list, two shapes: a table on a desktop, stacked cards below the md breakpoint.
 *
 * Cards rather than a horizontally scrolling table, because a table scrolled sideways
 * on a phone hides the column that says what a value means, and every column here is a
 * label plus a value that is meaningless without it.
 *
 * An error is rendered instead of the rows, never alongside an empty list. An empty
 * table and a forbidden table look identical, and they mean completely different
 * things.
 */
export const ResponsiveTable = <T,>({
  caption,
  rows,
  columns,
  rowKey,
  empty = 'Nothing here yet.',
  isLoading = false,
  error,
}: Props<T>) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (isLoading) {
    return (
      <Box role="status" aria-label={`Loading ${caption}`} sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (rows.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4 }}>
        {empty}
      </Typography>
    );
  }

  if (isDesktop) {
    return (
      <Paper>
        <Table aria-label={caption}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.id} align={column.align ?? 'left'}>
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={rowKey(row)} hover>
                {columns.map((column) => (
                  <TableCell key={column.id} align={column.align ?? 'left'}>
                    {column.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    );
  }

  return (
    <Stack spacing={1.5} aria-label={caption}>
      {rows.map((row) => (
        <Paper key={rowKey(row)} sx={{ p: 2 }}>
          <Stack spacing={1}>
            {columns.map((column) => (
              <Stack
                key={column.id}
                direction="row"
                spacing={2}
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="body2" color="text.secondary">
                  {column.label}
                </Typography>
                <Box sx={{ textAlign: 'right', minWidth: 0 }}>{column.render(row)}</Box>
              </Stack>
            ))}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
};

export default ResponsiveTable;
```

- [ ] **Step 10: Write the failing test for `ConfirmDialog`**

`admin/src/components/ConfirmDialog.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('names the subject so a misclick is visible before it is confirmed', () => {
    renderWithProviders(
      <ConfirmDialog
        open
        title="Publish Amber?"
        body="Amber becomes available to every user."
        confirmLabel="Publish"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('dialog', { name: 'Publish Amber?' })).toBeInTheDocument();
    expect(screen.getByText(/available to every user/i)).toBeInTheDocument();
  });

  it('calls onConfirm once', async () => {
    const onConfirm = vi.fn();
    renderWithProviders(
      <ConfirmDialog open title="Delete" body="Gone." confirmLabel="Delete" onConfirm={onConfirm} onCancel={vi.fn()} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel from the cancel button', async () => {
    const onCancel = vi.fn();
    renderWithProviders(
      <ConfirmDialog open title="Delete" body="Gone." confirmLabel="Delete" onConfirm={vi.fn()} onCancel={onCancel} />
    );
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables both buttons while the action is in flight', () => {
    renderWithProviders(
      <ConfirmDialog open pending title="Delete" body="Gone." confirmLabel="Delete" onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });
});
```

- [ ] **Step 11: Run it to verify it fails**

Run: `cd admin && npx vitest run src/components/ConfirmDialog.test.tsx`
Expected: FAIL, cannot resolve `./ConfirmDialog`.

- [ ] **Step 12: Write `admin/src/components/ConfirmDialog.tsx`**

```tsx
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

interface Props {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  /** Destructive actions get the error colour. Publishing does not. */
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation for an action that other people will notice.
 *
 * The title names the subject rather than asking "Are you sure?", so a misclick is
 * caught by reading one line. Both buttons disable while the request is in flight,
 * because a double-confirm on a publish is two POSTs and an administrator has no way
 * to tell the second one did nothing.
 */
export const ConfirmDialog = ({
  open,
  title,
  body,
  confirmLabel,
  destructive = false,
  pending = false,
  onConfirm,
  onCancel,
}: Props) => (
  <Dialog open={open} onClose={pending ? undefined : onCancel} aria-labelledby="confirm-title">
    <DialogTitle id="confirm-title">{title}</DialogTitle>
    <DialogContent>
      <DialogContentText>{body}</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} disabled={pending}>
        Cancel
      </Button>
      <Button
        onClick={onConfirm}
        disabled={pending}
        variant="contained"
        color={destructive ? 'error' : 'primary'}
      >
        {confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
```

- [ ] **Step 13: Run the suite and lint**

Run: `cd admin && npm run lint && npm test`
Expected: all green.

- [ ] **Step 14: Commit**

```bash
git add admin/src/api/queries.ts admin/src/usageCounts.ts admin/src/usageCounts.test.ts admin/src/components/ admin/src/test/
git commit -m "feat(admin): query keys, usage counts and the shared table and dialog"
```

---

### Task 8: Colour palettes section

**Files:**
- Create: `admin/src/sections/palettes/PalettesSection.tsx`, `admin/src/sections/palettes/PaletteEditor.tsx`, `admin/src/sections/palettes/PalettePreview.tsx`, `admin/src/sections/palettes/colorField.ts`
- Modify: `admin/src/sections/registry.tsx`
- Test: `admin/src/sections/palettes/colorField.test.ts`, `admin/src/sections/palettes/PaletteEditor.test.tsx`, `admin/src/sections/palettes/PalettesSection.test.tsx`

**Interfaces:**
- Consumes: `usePalettes`, `queryKeys` (Task 7), `designUsage` (Task 7), `ResponsiveTable`, `ConfirmDialog` (Task 7), the palette functions in `api/admin.ts` (Task 4).
- Produces: `PalettesSection`, registered at `/design/palettes`. `normaliseHex(value: string): string | null` from `colorField.ts` is reused by Task 9's preview tinting.

- [ ] **Step 1: Write the failing test for the hex field rule**

`admin/src/sections/palettes/colorField.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normaliseHex } from './colorField';

describe('normaliseHex', () => {
  it('accepts a six digit hex and lowercases it', () => {
    expect(normaliseHex('#E8C37E')).toBe('#e8c37e');
  });

  it('adds the missing hash, which is what pasting from a design tool produces', () => {
    expect(normaliseHex('e8c37e')).toBe('#e8c37e');
  });

  it('expands a three digit shorthand, because an <input type=color> cannot take one', () => {
    expect(normaliseHex('#abc')).toBe('#aabbcc');
  });

  it('trims surrounding whitespace', () => {
    expect(normaliseHex('  #e8c37e  ')).toBe('#e8c37e');
  });

  it('rejects anything that is not a hex colour', () => {
    expect(normaliseHex('')).toBeNull();
    expect(normaliseHex('rebeccapurple')).toBeNull();
    expect(normaliseHex('#12345')).toBeNull();
    expect(normaliseHex('#gggggg')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd admin && npx vitest run src/sections/palettes/colorField.test.ts`
Expected: FAIL, cannot resolve `./colorField`.

- [ ] **Step 3: Write `admin/src/sections/palettes/colorField.ts`**

```ts
/**
 * Normalises what someone types or pastes into a hex colour field.
 *
 * The paired <input type="color"> only accepts `#rrggbb`, so a shorthand or a
 * hash-less value from a design tool has to be expanded before it can be handed over,
 * or the swatch silently reverts to black while the text field still reads correctly.
 *
 * Returns null for anything that is not a hex colour, which the field renders as an
 * error rather than guessing.
 */
const SHORTHAND = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const FULL = /^#?([0-9a-f]{6})$/i;

export const normaliseHex = (value: string): string | null => {
  const trimmed = value.trim();

  const shorthand = SHORTHAND.exec(trimmed);
  if (shorthand) {
    const [, r, g, b] = shorthand;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  const full = FULL.exec(trimmed);
  if (full) {
    return `#${full[1]}`.toLowerCase();
  }

  return null;
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd admin && npx vitest run src/sections/palettes/colorField.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Write `admin/src/sections/palettes/PalettePreview.tsx`**

```tsx
import { Box, Paper, Stack, Typography } from '@mui/material';
import type { ColorPalette } from '../../types/api';

/**
 * A palette rendered the way the consumer app renders it: the field colour as the
 * surface, the ink colour as the text on it, shown in both modes side by side.
 *
 * This file is exempt from the no-colour-literals rule by path, and has to be: it
 * paints the values being edited, so reading a token here instead would make the
 * preview show something other than what is about to be saved.
 */
export const PalettePreview = ({ palette }: { palette: Pick<ColorPalette, 'field' | 'inkLight' | 'inkDark' | 'name'> }) => (
  <Stack direction="row" spacing={2}>
    {(['dark', 'light'] as const).map((mode) => {
      const ink = mode === 'dark' ? palette.inkDark : (palette.inkLight ?? palette.inkDark);
      return (
        <Paper
          key={mode}
          sx={{
            flex: 1,
            p: 2,
            display: 'grid',
            gap: 1,
            placeItems: 'center',
            background: mode === 'dark' ? '#151412' : '#faf7f1',
          }}
        >
          <Typography variant="caption" sx={{ color: mode === 'dark' ? '#a49b8b' : '#6b6357' }}>
            {mode}
          </Typography>
          <Box
            aria-label={`${palette.name || 'Untitled'} preview, ${mode} mode`}
            sx={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: palette.field,
              color: ink,
              fontWeight: 600,
            }}
          >
            {palette.name || 'Aa'}
          </Box>
        </Paper>
      );
    })}
  </Stack>
);

export default PalettePreview;
```

- [ ] **Step 6: Write the failing test for the editor**

`admin/src/sections/palettes/PaletteEditor.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/test-utils';
import { PaletteEditor } from './PaletteEditor';

const palette = {
  id: 1,
  name: 'Amber',
  field: '#e8c37e',
  inkLight: '#1b1a17',
  inkDark: '#1b1a17',
};

describe('PaletteEditor', () => {
  it('shows the current values', () => {
    renderWithProviders(<PaletteEditor palette={palette} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText('Name')).toHaveValue('Amber');
    expect(screen.getByLabelText('Field hex')).toHaveValue('#e8c37e');
  });

  it('keeps the colour picker and the hex field in sync', async () => {
    renderWithProviders(<PaletteEditor palette={palette} onSave={vi.fn()} onCancel={vi.fn()} />);
    const hex = screen.getByLabelText('Field hex');

    await userEvent.clear(hex);
    await userEvent.type(hex, '#abc');

    expect(screen.getByLabelText('Field colour')).toHaveValue('#aabbcc');
  });

  it('marks an unparseable hex as invalid and blocks the save', async () => {
    const onSave = vi.fn();
    renderWithProviders(<PaletteEditor palette={palette} onSave={onSave} onCancel={vi.fn()} />);

    const hex = screen.getByLabelText('Field hex');
    await userEvent.clear(hex);
    await userEvent.type(hex, 'rebeccapurple');

    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    expect(hex).toHaveAccessibleDescription(/hex colour/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('treats an empty light ink as null rather than an empty string', async () => {
    const onSave = vi.fn();
    renderWithProviders(<PaletteEditor palette={palette} onSave={onSave} onCancel={vi.fn()} />);

    await userEvent.clear(screen.getByLabelText('Light ink hex'));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ inkLight: null, field: '#e8c37e' })
    );
  });

  it('requires a name', async () => {
    renderWithProviders(<PaletteEditor palette={palette} onSave={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.clear(screen.getByLabelText('Name'));
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('renders a preview in both modes', () => {
    renderWithProviders(<PaletteEditor palette={palette} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText(/preview, dark mode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/preview, light mode/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `cd admin && npx vitest run src/sections/palettes/PaletteEditor.test.tsx`
Expected: FAIL, cannot resolve `./PaletteEditor`.

- [ ] **Step 8: Write `admin/src/sections/palettes/PaletteEditor.tsx`**

```tsx
import { useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { normaliseHex } from './colorField';
import { PalettePreview } from './PalettePreview';
import type { ColorPalette, NewColorPalette } from '../../types/api';

interface Props {
  palette: Pick<ColorPalette, 'name' | 'field' | 'inkLight' | 'inkDark'>;
  pending?: boolean;
  onSave: (draft: NewColorPalette) => void;
  onCancel: () => void;
}

/**
 * A colour, edited two ways at once.
 *
 * The picker and the hex field write the same piece of state: a swatch is faster to
 * judge, and a hex is what a design tool hands you. The hex field is the source of
 * truth because it can hold an in-progress value the picker cannot represent; the
 * picker only ever sees a normalised value.
 */
const ColourField = ({
  label,
  value,
  optional = false,
  onChange,
}: {
  label: string;
  value: string;
  optional?: boolean;
  onChange: (next: string) => void;
}) => {
  const normalised = normaliseHex(value);
  const empty = value.trim() === '';
  const invalid = !normalised && !(optional && empty);

  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box
        component="input"
        type="color"
        aria-label={`${label} colour`}
        value={normalised ?? '#000000'}
        onChange={(event) => onChange(event.target.value)}
        sx={{ width: 44, height: 40, p: 0, border: '1px solid var(--ds-line-hairline)', borderRadius: 1, background: 'none' }}
      />
      <TextField
        label={`${label} hex`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        error={invalid}
        helperText={
          invalid
            ? 'Enter a hex colour, for example #e8c37e.'
            : optional
              ? 'Leave empty to fall back to the dark ink.'
              : ' '
        }
        sx={{ flex: 1 }}
      />
    </Stack>
  );
};

export const PaletteEditor = ({ palette, pending = false, onSave, onCancel }: Props) => {
  const [name, setName] = useState(palette.name);
  const [field, setField] = useState(palette.field);
  const [inkDark, setInkDark] = useState(palette.inkDark);
  const [inkLight, setInkLight] = useState(palette.inkLight ?? '');

  const fieldHex = normaliseHex(field);
  const inkDarkHex = normaliseHex(inkDark);
  const inkLightHex = inkLight.trim() === '' ? null : normaliseHex(inkLight);
  const inkLightValid = inkLight.trim() === '' || inkLightHex !== null;

  const valid = name.trim().length > 0 && fieldHex !== null && inkDarkHex !== null && inkLightValid;

  const save = () => {
    if (!valid) return;
    onSave({
      name: name.trim(),
      field: fieldHex,
      inkDark: inkDarkHex,
      inkLight: inkLightHex,
    });
  };

  return (
    <Stack spacing={3}>
      <TextField
        label="Name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={name.trim().length === 0}
        helperText={name.trim().length === 0 ? 'A palette needs a name.' : ' '}
      />

      <ColourField label="Field" value={field} onChange={setField} />
      <ColourField label="Dark ink" value={inkDark} onChange={setInkDark} />
      <ColourField label="Light ink" value={inkLight} optional onChange={setInkLight} />

      <Box>
        <Typography variant="h3" component="h3" gutterBottom>
          Preview
        </Typography>
        <PalettePreview
          palette={{
            name: name.trim(),
            field: fieldHex ?? palette.field,
            inkDark: inkDarkHex ?? palette.inkDark,
            inkLight: inkLightHex,
          }}
        />
      </Box>

      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={!valid || pending}>
          Save
        </Button>
      </Stack>
    </Stack>
  );
};

export default PaletteEditor;
```

- [ ] **Step 9: Run it to verify it passes**

Run: `cd admin && npx vitest run src/sections/palettes/PaletteEditor.test.tsx`
Expected: 6 passed.

- [ ] **Step 10: Write the failing test for the section**

`admin/src/sections/palettes/PalettesSection.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { renderWithProviders } from '../../test/test-utils';
import { PalettesSection } from './PalettesSection';
import * as api from '../../api/admin';

vi.mock('../../api/admin');

const palettes = [
  { id: 1, name: 'Amber', field: '#e8c37e', inkLight: '#1b1a17', inkDark: '#1b1a17' },
  { id: 2, name: 'Slate', field: '#4a5057', inkLight: null, inkDark: '#f2ece1' },
];

const owned = { userId: 'u-1', shared: true };

const conflict = () => {
  const error = new AxiosError('conflict');
  error.response = { status: 409, data: {}, statusText: '', headers: {}, config: { headers: {} } } as never;
  return error;
};

describe('PalettesSection', () => {
  beforeEach(() => {
    vi.mocked(api.getColorPalettes).mockResolvedValue(palettes);
    vi.mocked(api.getAlcoholTypes).mockResolvedValue([
      { ...owned, id: 1, name: 'Lager', volumeIds: [], colorPaletteId: 1, glasswareId: 1 },
    ]);
    vi.mocked(api.getBrands).mockResolvedValue([]);
    vi.mocked(api.getConsumptionTypes).mockResolvedValue([]);
  });

  it('lists every palette with its usage count', async () => {
    renderWithProviders(<PalettesSection />);
    expect(await screen.findByText('Amber')).toBeInTheDocument();
    expect(screen.getByText('Slate')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('usage-1')).toHaveTextContent('1'));
    expect(screen.getByTestId('usage-2')).toHaveTextContent('0');
  });

  it('disables delete for a palette in use and says why', async () => {
    renderWithProviders(<PalettesSection />);
    await screen.findByText('Amber');
    await waitFor(() => expect(screen.getByLabelText('Delete Amber')).toBeDisabled());
    expect(screen.getByLabelText('Delete Amber')).toHaveAccessibleDescription(/in use/i);
  });

  it('saves an edit and refreshes the list', async () => {
    vi.mocked(api.updateColorPalette).mockResolvedValue({ ...palettes[1], name: 'Slate blue' });
    renderWithProviders(<PalettesSection />);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Slate' }));
    const name = screen.getByLabelText('Name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Slate blue');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(api.updateColorPalette).toHaveBeenCalledWith(2, expect.objectContaining({ name: 'Slate blue' }))
    );
  });

  it('creates a palette from the new button', async () => {
    vi.mocked(api.createColorPalette).mockResolvedValue({ ...palettes[0], id: 3, name: 'Moss' });
    renderWithProviders(<PalettesSection />);

    await userEvent.click(await screen.findByRole('button', { name: /new palette/i }));
    await userEvent.type(screen.getByLabelText('Name'), 'Moss');
    await userEvent.type(screen.getByLabelText('Field hex'), '#4c6b3c');
    await userEvent.type(screen.getByLabelText('Dark ink hex'), '#f2ece1');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(api.createColorPalette).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Moss', field: '#4c6b3c', inkLight: null })
      )
    );
  });

  it('deletes an unused palette after confirmation', async () => {
    vi.mocked(api.deleteColorPalette).mockResolvedValue(undefined);
    renderWithProviders(<PalettesSection />);

    await screen.findByText('Slate');
    await userEvent.click(screen.getByLabelText('Delete Slate'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(api.deleteColorPalette).toHaveBeenCalledWith(2));
  });

  it('reports a 409 from the server rather than pretending the delete worked', async () => {
    vi.mocked(api.deleteColorPalette).mockRejectedValue(conflict());
    renderWithProviders(<PalettesSection />);

    await screen.findByText('Slate');
    await userEvent.click(screen.getByLabelText('Delete Slate'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/still in use/i);
  });

  it('shows an error instead of an empty list when the read fails', async () => {
    vi.mocked(api.getColorPalettes).mockRejectedValue(new Error('network'));
    renderWithProviders(<PalettesSection />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
```

- [ ] **Step 11: Run it to verify it fails**

Run: `cd admin && npx vitest run src/sections/palettes/PalettesSection.test.tsx`
Expected: FAIL, cannot resolve `./PalettesSection`.

- [ ] **Step 12: Write `admin/src/sections/palettes/PalettesSection.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
// display:none and visibility:hidden are not exposed to assistive technology, so a
// description hidden that way is not a description at all. This is the one clipping
// pattern screen readers do read.
import { visuallyHidden } from '@mui/utils';
import {
  createColorPalette,
  deleteColorPalette,
  updateColorPalette,
} from '../../api/admin';
import { queryKeys, useAlcoholTypes, useBrands, useConsumptionTypes, usePalettes } from '../../api/queries';
import { apiErrorMessage } from '../../api/errors';
import { designUsage } from '../../usageCounts';
import { ResponsiveTable, type Column } from '../../components/ResponsiveTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PaletteEditor } from './PaletteEditor';
import type { ColorPalette, NewColorPalette } from '../../types/api';

const BLANK: NewColorPalette = { name: '', field: '', inkDark: '', inkLight: null };

export const PalettesSection = () => {
  const queryClient = useQueryClient();
  const palettes = usePalettes();
  const alcoholTypes = useAlcoholTypes();
  const brands = useBrands();
  const consumptionTypes = useConsumptionTypes();

  const [editing, setEditing] = useState<ColorPalette | 'new' | null>(null);
  const [deleting, setDeleting] = useState<ColorPalette | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const usage = useMemo(
    () =>
      designUsage({
        alcoholTypes: alcoholTypes.data,
        brands: brands.data,
        consumptionTypes: consumptionTypes.data,
      }),
    [alcoholTypes.data, brands.data, consumptionTypes.data]
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.palettes });

  const save = useMutation({
    mutationFn: (draft: NewColorPalette) =>
      editing && editing !== 'new'
        ? updateColorPalette(editing.id, draft)
        : createColorPalette(draft),
    onSuccess: async () => {
      setActionError(null);
      setEditing(null);
      await invalidate();
    },
    onError: (error) => setActionError(apiErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (palette: ColorPalette) => deleteColorPalette(palette.id),
    onSuccess: async () => {
      setActionError(null);
      setDeleting(null);
      await invalidate();
    },
    onError: (error) => {
      setActionError(apiErrorMessage(error));
      setDeleting(null);
    },
  });

  const columns: Column<ColorPalette>[] = [
    {
      id: 'swatches',
      label: 'Colours',
      render: (palette) => (
        <Stack direction="row" spacing={0.5}>
          {[palette.field, palette.inkDark, palette.inkLight].map((colour, index) =>
            colour ? (
              <Box
                key={index}
                aria-hidden
                sx={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--ds-line-hairline)', background: colour }}
              />
            ) : null
          )}
        </Stack>
      ),
    },
    { id: 'name', label: 'Name', render: (palette) => palette.name },
    {
      id: 'usage',
      label: 'Referenced by reference data',
      align: 'right',
      render: (palette) => (
        <span data-testid={`usage-${palette.id}`}>{usage.palettes.get(palette.id) ?? 0}</span>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (palette) => {
        const inUse = (usage.palettes.get(palette.id) ?? 0) > 0;
        const reason = inUse
          ? 'This palette is in use, so it cannot be deleted.'
          : 'Delete this palette.';
        return (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            <IconButton aria-label={`Edit ${palette.name}`} onClick={() => setEditing(palette)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <Tooltip title={reason}>
              <span>
                <IconButton
                  aria-label={`Delete ${palette.name}`}
                  aria-describedby={`delete-reason-${palette.id}`}
                  disabled={inUse}
                  onClick={() => setDeleting(palette)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
                <Box component="span" id={`delete-reason-${palette.id}`} sx={visuallyHidden}>
                  {reason}
                </Box>
              </span>
            </Tooltip>
          </Stack>
        );
      },
    },
  ];

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h1" component="h1">
          Colour palettes
        </Typography>
        <Button variant="contained" onClick={() => setEditing('new')}>
          New palette
        </Button>
      </Stack>

      {actionError && <Alert severity="error">{actionError}</Alert>}

      <ResponsiveTable
        caption="Colour palettes"
        rows={palettes.data ?? []}
        columns={columns}
        rowKey={(palette) => palette.id}
        isLoading={palettes.isLoading}
        error={palettes.isError ? apiErrorMessage(palettes.error) : undefined}
        empty="No palettes yet. Create one to get started."
      />

      <Dialog open={editing !== null} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>{editing === 'new' ? 'New palette' : `Edit ${editing?.name ?? ''}`}</DialogTitle>
        <DialogContent>
          {editing && (
            <Box sx={{ pt: 1 }}>
              <PaletteEditor
                palette={editing === 'new' ? BLANK : editing}
                pending={save.isPending}
                onSave={(draft) => save.mutate(draft)}
                onCancel={() => setEditing(null)}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        destructive
        pending={remove.isPending}
        title={`Delete ${deleting?.name ?? ''}?`}
        body="Anything still pointing at this palette will lose its colour. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleting && remove.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </Stack>
  );
};

export default PalettesSection;
```

- [ ] **Step 13: Register the section**

In `admin/src/sections/registry.tsx`, replace the palettes placeholder element:

```tsx
import { PalettesSection } from './palettes/PalettesSection';
```

```tsx
    element: <PalettesSection />,
```

- [ ] **Step 14: Run the suite and lint**

Run: `cd admin && npm run lint && npm test`
Expected: all green. If lint flags a colour literal in `PalettePreview.tsx`, confirm the
`ignores` path in `eslint.config.js` covers `src/sections/palettes/**`.

- [ ] **Step 15: Commit**

```bash
git add admin/src/sections/
git commit -m "feat(admin): colour palette curation"
```

---

### Task 9: Glassware section

**Files:**
- Create: `admin/src/sections/glassware/svgPath.ts`, `admin/src/sections/glassware/GlasswarePreview.tsx`, `admin/src/sections/glassware/GlasswareEditor.tsx`, `admin/src/sections/glassware/GlasswareSection.tsx`
- Modify: `admin/src/sections/registry.tsx`, `admin/src/test/setup.ts`
- Test: `admin/src/sections/glassware/svgPath.test.ts`, `admin/src/sections/glassware/GlasswareEditor.test.tsx`, `admin/src/sections/glassware/GlasswareSection.test.tsx`

**Interfaces:**
- Consumes: the glassware functions in `api/admin.ts` (Task 4), `usePalettes` and `useGlassware` (Task 7), `ResponsiveTable`, `ConfirmDialog` (Task 7), `normaliseHex` (Task 8).
- Produces: `isValidPath(d: string): boolean` from `svgPath.ts`, `GlasswarePreview`, `GlasswareEditor`, `GlasswareSection` registered at `/design/glassware`.

- [ ] **Step 1: Add the `Path2D` stub to `admin/src/test/setup.ts`**

jsdom implements neither `Path2D` nor a canvas 2D context, so the validator has to be given
something to fail against deterministically. Append to `setup.ts`:

```ts
/**
 * jsdom has no Path2D and no canvas 2D context, so the glassware path validator would
 * throw on import rather than validate anything.
 *
 * The stub implements the one behaviour the validator depends on: a constructor that
 * throws for input a browser could not parse. The grammar here is deliberately small,
 * a command letter followed by numbers and separators, which is enough to separate a
 * real path from prose in a test. Real browsers apply the full SVG path grammar, so
 * this stub is more permissive than production, never less: a path this accepts and a
 * browser rejects is caught by the render probe at runtime.
 */
class StubPath2D {
  constructor(d?: string) {
    if (typeof d !== 'string' || d.trim() === '') {
      throw new TypeError('Path2D requires a path string');
    }
    if (!/^[Mm]\s*-?\d/.test(d.trim())) {
      throw new TypeError(`Failed to parse path: ${d}`);
    }
    if (/[^MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]/.test(d)) {
      throw new TypeError(`Failed to parse path: ${d}`);
    }
  }
}

if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = StubPath2D as unknown as typeof Path2D;
}
```

- [ ] **Step 2: Write the failing test for the path validator**

`admin/src/sections/glassware/svgPath.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isValidPath, pathError } from './svgPath';

describe('isValidPath', () => {
  it('accepts a simple path', () => {
    expect(isValidPath('M0 0 L10 10 Z')).toBe(true);
  });

  it('accepts a curve', () => {
    expect(isValidPath('M4 2 C6 2 8 4 8 6 L8 20 Z')).toBe(true);
  });

  it('rejects an empty or whitespace-only value', () => {
    expect(isValidPath('')).toBe(false);
    expect(isValidPath('   ')).toBe(false);
  });

  it('rejects prose, which is what a bad paste looks like', () => {
    expect(isValidPath('the glass outline')).toBe(false);
  });

  it('rejects a path that does not start with a move command', () => {
    expect(isValidPath('L10 10')).toBe(false);
  });
});

describe('pathError', () => {
  it('returns null for a valid path', () => {
    expect(pathError('M0 0 L10 10 Z')).toBeNull();
  });

  it('explains an empty required field', () => {
    expect(pathError('')).toMatch(/required/i);
  });

  it('explains an unparseable path', () => {
    expect(pathError('nonsense')).toMatch(/not a valid svg path/i);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd admin && npx vitest run src/sections/glassware/svgPath.test.ts`
Expected: FAIL, cannot resolve `./svgPath`.

- [ ] **Step 4: Write `admin/src/sections/glassware/svgPath.ts`**

```ts
/**
 * Whether the browser can parse an SVG path.
 *
 * Constructing a Path2D is the check: it is the same parser the renderer uses, so
 * anything it accepts will draw and anything it rejects would have been stored as an
 * invisible glass in somebody's drink history, discovered weeks later with no clue
 * pointing back to the admin panel.
 *
 * Browsers disagree on how loudly they fail. Chrome throws for malformed input,
 * Firefox and Safari can return a Path2D that draws nothing. The leading move-command
 * check catches the silent case, which is the one that matters: a path that does not
 * begin with M or m has no start point and renders as nothing anywhere.
 */
const STARTS_WITH_MOVE = /^\s*[Mm]\s*-?[\d.]/;

export const isValidPath = (d: string): boolean => {
  if (typeof d !== 'string' || d.trim() === '') return false;
  if (!STARTS_WITH_MOVE.test(d)) return false;
  try {
    new Path2D(d);
    return true;
  } catch {
    return false;
  }
};

/** A message for the field, or null when the value is fine. */
export const pathError = (d: string, { optional = false }: { optional?: boolean } = {}): string | null => {
  if (d.trim() === '') {
    return optional ? null : 'This path is required.';
  }
  return isValidPath(d) ? null : 'That is not a valid SVG path. It must start with M or m.';
};
```

- [ ] **Step 5: Run it to verify it passes**

Run: `cd admin && npx vitest run src/sections/glassware/svgPath.test.ts`
Expected: 8 passed.

- [ ] **Step 6: Write `admin/src/sections/glassware/GlasswarePreview.tsx`**

```tsx
import { Box } from '@mui/material';
import type { ColorPalette, Glassware } from '../../types/api';

/**
 * A glass drawn from its three paths, tinted by a palette.
 *
 * Glassware and palette are only meaningful together: an outline on its own says
 * nothing about whether the fill reads against the liquid. The palette is chosen by
 * the editor rather than fixed, so a glass can be checked against the palettes it will
 * actually be paired with.
 *
 * Exempt from the no-colour-literals rule by path: the fallback below has to be a
 * literal, because it paints when no palette is selected yet and there is no token for
 * "no colour chosen".
 */
export const GlasswarePreview = ({
  glass,
  palette,
  size = 160,
}: {
  glass: Pick<Glassware, 'g' | 'l' | 'f'> & { name?: string };
  palette?: Pick<ColorPalette, 'field' | 'inkDark'>;
  size?: number;
}) => {
  const liquid = palette?.field ?? '#8a8a8a';
  const outline = palette?.inkDark ?? '#f2ece1';

  return (
    <Box
      component="svg"
      role="img"
      aria-label={`${glass.name ?? 'Glassware'} preview`}
      viewBox="0 0 24 24"
      sx={{ width: size, height: size, display: 'block' }}
    >
      {glass.l && <path d={glass.l} fill={liquid} />}
      {glass.f && <path d={glass.f} fill={liquid} opacity={0.45} />}
      {glass.g && <path d={glass.g} fill="none" stroke={outline} strokeWidth={0.75} />}
    </Box>
  );
};

export default GlasswarePreview;
```

- [ ] **Step 7: Write the failing test for the editor**

`admin/src/sections/glassware/GlasswareEditor.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/test-utils';
import { GlasswareEditor } from './GlasswareEditor';

const glass = { id: 1, name: 'Tumbler', g: 'M4 2 L8 20 Z', l: 'M5 10 L7 18 Z', f: null };
const palettes = [{ id: 1, name: 'Amber', field: '#e8c37e', inkLight: null, inkDark: '#1b1a17' }];

describe('GlasswareEditor', () => {
  it('shows the three path fields with their current values', () => {
    renderWithProviders(
      <GlasswareEditor glass={glass} palettes={palettes} onSave={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByLabelText('Glass outline (g)')).toHaveValue('M4 2 L8 20 Z');
    expect(screen.getByLabelText('Liquid (l)')).toHaveValue('M5 10 L7 18 Z');
    expect(screen.getByLabelText('Foam (f)')).toHaveValue('');
  });

  it('rejects an unparseable path before it can be saved', async () => {
    const onSave = vi.fn();
    renderWithProviders(
      <GlasswareEditor glass={glass} palettes={palettes} onSave={onSave} onCancel={vi.fn()} />
    );

    const outline = screen.getByLabelText('Glass outline (g)');
    await userEvent.clear(outline);
    await userEvent.type(outline, 'not a path');

    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    expect(outline).toHaveAccessibleDescription(/not a valid svg path/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('treats the foam path as optional and sends null when it is empty', async () => {
    const onSave = vi.fn();
    renderWithProviders(
      <GlasswareEditor glass={glass} palettes={palettes} onSave={onSave} onCancel={vi.fn()} />
    );

    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ f: null, name: 'Tumbler' }));
  });

  it('rejects an invalid foam path even though the field is optional', async () => {
    renderWithProviders(
      <GlasswareEditor glass={glass} palettes={palettes} onSave={vi.fn()} onCancel={vi.fn()} />
    );

    await userEvent.type(screen.getByLabelText('Foam (f)'), 'garbage');
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('renders a live preview that updates as a path changes', async () => {
    renderWithProviders(
      <GlasswareEditor glass={glass} palettes={palettes} onSave={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByRole('img', { name: /preview/i })).toBeInTheDocument();

    const liquid = screen.getByLabelText('Liquid (l)');
    await userEvent.clear(liquid);
    await userEvent.type(liquid, 'M5 12 L7 18 Z');

    expect(screen.getByRole('img', { name: /preview/i }).querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('lets the preview palette be changed without changing the saved values', async () => {
    const onSave = vi.fn();
    renderWithProviders(
      <GlasswareEditor
        glass={glass}
        palettes={[...palettes, { id: 2, name: 'Slate', field: '#4a5057', inkLight: null, inkDark: '#f2ece1' }]}
        onSave={onSave}
        onCancel={vi.fn()}
      />
    );

    await userEvent.click(screen.getByLabelText('Preview palette'));
    await userEvent.click(screen.getByRole('option', { name: 'Slate' }));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.not.objectContaining({ colorPaletteId: expect.anything() })
    );
  });

  it('requires a name', async () => {
    renderWithProviders(
      <GlasswareEditor glass={glass} palettes={palettes} onSave={vi.fn()} onCancel={vi.fn()} />
    );
    await userEvent.clear(screen.getByLabelText('Name'));
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });
});
```

- [ ] **Step 8: Run it to verify it fails**

Run: `cd admin && npx vitest run src/sections/glassware/GlasswareEditor.test.tsx`
Expected: FAIL, cannot resolve `./GlasswareEditor`.

- [ ] **Step 9: Write `admin/src/sections/glassware/GlasswareEditor.tsx`**

```tsx
import { useState } from 'react';
import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { pathError } from './svgPath';
import { GlasswarePreview } from './GlasswarePreview';
import type { ColorPalette, Glassware, NewGlassware } from '../../types/api';

interface Props {
  glass: Pick<Glassware, 'name' | 'g' | 'l' | 'f'>;
  palettes: readonly ColorPalette[];
  pending?: boolean;
  onSave: (draft: NewGlassware) => void;
  onCancel: () => void;
}

const PathField = ({
  label,
  value,
  optional = false,
  onChange,
}: {
  label: string;
  value: string;
  optional?: boolean;
  onChange: (next: string) => void;
}) => {
  const error = pathError(value, { optional });
  return (
    <TextField
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={error !== null}
      helperText={error ?? (optional ? 'Optional. Leave empty for no foam.' : ' ')}
      multiline
      minRows={2}
      slotProps={{ input: { sx: { fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 13 } } }}
    />
  );
};

/**
 * Three raw paths and a live preview.
 *
 * The preview palette is local state, never part of the saved draft. Glassware carries
 * no palette of its own in the data model, and putting the dropdown's value into the
 * payload would invent an assignment nobody asked for.
 */
export const GlasswareEditor = ({ glass, palettes, pending = false, onSave, onCancel }: Props) => {
  const [name, setName] = useState(glass.name);
  const [g, setG] = useState(glass.g);
  const [l, setL] = useState(glass.l);
  const [f, setF] = useState(glass.f ?? '');
  const [previewPaletteId, setPreviewPaletteId] = useState<number | ''>(palettes[0]?.id ?? '');

  const valid =
    name.trim().length > 0 &&
    pathError(g) === null &&
    pathError(l) === null &&
    pathError(f, { optional: true }) === null;

  const previewPalette = palettes.find((palette) => palette.id === previewPaletteId);

  return (
    <Stack spacing={3}>
      <TextField
        label="Name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={name.trim().length === 0}
        helperText={name.trim().length === 0 ? 'Glassware needs a name.' : ' '}
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
          <PathField label="Glass outline (g)" value={g} onChange={setG} />
          <PathField label="Liquid (l)" value={l} onChange={setL} />
          <PathField label="Foam (f)" value={f} optional onChange={setF} />
        </Stack>

        <Stack spacing={2} sx={{ width: { xs: '100%', md: 220 } }}>
          <Typography variant="h3" component="h3">
            Preview
          </Typography>
          <GlasswarePreview
            glass={{ name, g, l, f: f.trim() === '' ? null : f }}
            palette={previewPalette}
          />
          <TextField
            select
            label="Preview palette"
            value={previewPaletteId}
            onChange={(event) => setPreviewPaletteId(Number(event.target.value))}
            helperText="Preview only. Not saved with the glassware."
          >
            {palettes.map((palette) => (
              <MenuItem key={palette.id} value={palette.id}>
                {palette.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Stack>

      <Box>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!valid || pending}
            onClick={() =>
              onSave({
                name: name.trim(),
                g: g.trim(),
                l: l.trim(),
                f: f.trim() === '' ? null : f.trim(),
              })
            }
          >
            Save
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
};

export default GlasswareEditor;
```

- [ ] **Step 10: Write the failing test for the section**

`admin/src/sections/glassware/GlasswareSection.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/test-utils';
import { GlasswareSection } from './GlasswareSection';
import * as api from '../../api/admin';

vi.mock('../../api/admin');

const glassware = [
  { id: 1, name: 'Tumbler', g: 'M4 2 L8 20 Z', l: 'M5 10 L7 18 Z', f: null },
  { id: 2, name: 'Flute', g: 'M6 2 L9 20 Z', l: 'M7 8 L8 18 Z', f: 'M7 8 L8 9 Z' },
];

const owned = { userId: 'u-1', shared: true };

describe('GlasswareSection', () => {
  beforeEach(() => {
    vi.mocked(api.getGlassware).mockResolvedValue(glassware);
    vi.mocked(api.getColorPalettes).mockResolvedValue([
      { id: 1, name: 'Amber', field: '#e8c37e', inkLight: null, inkDark: '#1b1a17' },
    ]);
    vi.mocked(api.getAlcoholTypes).mockResolvedValue([
      { ...owned, id: 1, name: 'Lager', volumeIds: [], colorPaletteId: 1, glasswareId: 1 },
    ]);
    vi.mocked(api.getBrands).mockResolvedValue([]);
    vi.mocked(api.getConsumptionTypes).mockResolvedValue([]);
  });

  it('lists every glassware with a rendered preview and a usage count', async () => {
    renderWithProviders(<GlasswareSection />);
    expect(await screen.findByText('Tumbler')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /tumbler preview/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('usage-1')).toHaveTextContent('1'));
  });

  it('disables delete for glassware in use', async () => {
    renderWithProviders(<GlasswareSection />);
    await screen.findByText('Tumbler');
    await waitFor(() => expect(screen.getByLabelText('Delete Tumbler')).toBeDisabled());
  });

  it('saves an edited path', async () => {
    vi.mocked(api.updateGlassware).mockResolvedValue({ ...glassware[1], l: 'M7 9 L8 18 Z' });
    renderWithProviders(<GlasswareSection />);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Flute' }));
    const liquid = screen.getByLabelText('Liquid (l)');
    await userEvent.clear(liquid);
    await userEvent.type(liquid, 'M7 9 L8 18 Z');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(api.updateGlassware).toHaveBeenCalledWith(2, expect.objectContaining({ l: 'M7 9 L8 18 Z' }))
    );
  });

  it('creates new glassware', async () => {
    vi.mocked(api.createGlassware).mockResolvedValue({ ...glassware[0], id: 3, name: 'Snifter' });
    renderWithProviders(<GlasswareSection />);

    await userEvent.click(await screen.findByRole('button', { name: /new glassware/i }));
    await userEvent.type(screen.getByLabelText('Name'), 'Snifter');
    await userEvent.type(screen.getByLabelText('Glass outline (g)'), 'M4 4 L8 18 Z');
    await userEvent.type(screen.getByLabelText('Liquid (l)'), 'M5 12 L7 17 Z');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(api.createGlassware).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Snifter', f: null })
      )
    );
  });

  it('deletes unused glassware after confirmation', async () => {
    vi.mocked(api.deleteGlassware).mockResolvedValue(undefined);
    renderWithProviders(<GlasswareSection />);

    await screen.findByText('Flute');
    await userEvent.click(screen.getByLabelText('Delete Flute'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(api.deleteGlassware).toHaveBeenCalledWith(2));
  });

  it('shows an error instead of an empty list when the read fails', async () => {
    vi.mocked(api.getGlassware).mockRejectedValue(new Error('network'));
    renderWithProviders(<GlasswareSection />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
```

- [ ] **Step 11: Run it to verify it fails**

Run: `cd admin && npx vitest run src/sections/glassware/GlasswareSection.test.tsx`
Expected: FAIL, cannot resolve `./GlasswareSection`.

- [ ] **Step 12: Write `admin/src/sections/glassware/GlasswareSection.tsx`**

Same structure as `PalettesSection`, with the glassware mutations, `usage.glassware` for the
counts, and a preview in the first column.

```tsx
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
// See PalettesSection: display:none would hide this from assistive technology too.
import { visuallyHidden } from '@mui/utils';
import { createGlassware, deleteGlassware, updateGlassware } from '../../api/admin';
import {
  queryKeys,
  useAlcoholTypes,
  useBrands,
  useConsumptionTypes,
  useGlassware,
  usePalettes,
} from '../../api/queries';
import { apiErrorMessage } from '../../api/errors';
import { designUsage } from '../../usageCounts';
import { ResponsiveTable, type Column } from '../../components/ResponsiveTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { GlasswareEditor } from './GlasswareEditor';
import { GlasswarePreview } from './GlasswarePreview';
import type { Glassware, NewGlassware } from '../../types/api';

const BLANK: NewGlassware = { name: '', g: '', l: '', f: null };

export const GlasswareSection = () => {
  const queryClient = useQueryClient();
  const glassware = useGlassware();
  const palettes = usePalettes();
  const alcoholTypes = useAlcoholTypes();
  const brands = useBrands();
  const consumptionTypes = useConsumptionTypes();

  const [editing, setEditing] = useState<Glassware | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Glassware | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const usage = useMemo(
    () =>
      designUsage({
        alcoholTypes: alcoholTypes.data,
        brands: brands.data,
        consumptionTypes: consumptionTypes.data,
      }),
    [alcoholTypes.data, brands.data, consumptionTypes.data]
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.glassware });

  const save = useMutation({
    mutationFn: (draft: NewGlassware) =>
      editing && editing !== 'new' ? updateGlassware(editing.id, draft) : createGlassware(draft),
    onSuccess: async () => {
      setActionError(null);
      setEditing(null);
      await invalidate();
    },
    onError: (error) => setActionError(apiErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (glass: Glassware) => deleteGlassware(glass.id),
    onSuccess: async () => {
      setActionError(null);
      setDeleting(null);
      await invalidate();
    },
    onError: (error) => {
      setActionError(apiErrorMessage(error));
      setDeleting(null);
    },
  });

  const columns: Column<Glassware>[] = [
    {
      id: 'preview',
      label: 'Glass',
      render: (glass) => (
        <GlasswarePreview glass={glass} palette={palettes.data?.[0]} size={44} />
      ),
    },
    { id: 'name', label: 'Name', render: (glass) => glass.name },
    {
      id: 'usage',
      label: 'Referenced by reference data',
      align: 'right',
      render: (glass) => (
        <span data-testid={`usage-${glass.id}`}>{usage.glassware.get(glass.id) ?? 0}</span>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (glass) => {
        const inUse = (usage.glassware.get(glass.id) ?? 0) > 0;
        const reason = inUse
          ? 'This glassware is in use, so it cannot be deleted.'
          : 'Delete this glassware.';
        return (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            <IconButton aria-label={`Edit ${glass.name}`} onClick={() => setEditing(glass)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <Tooltip title={reason}>
              <span>
                <IconButton
                  aria-label={`Delete ${glass.name}`}
                  aria-describedby={`delete-reason-${glass.id}`}
                  disabled={inUse}
                  onClick={() => setDeleting(glass)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
                <Box component="span" id={`delete-reason-${glass.id}`} sx={visuallyHidden}>
                  {reason}
                </Box>
              </span>
            </Tooltip>
          </Stack>
        );
      },
    },
  ];

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h1" component="h1">
          Glassware
        </Typography>
        <Button variant="contained" onClick={() => setEditing('new')}>
          New glassware
        </Button>
      </Stack>

      {actionError && <Alert severity="error">{actionError}</Alert>}

      <ResponsiveTable
        caption="Glassware"
        rows={glassware.data ?? []}
        columns={columns}
        rowKey={(glass) => glass.id}
        isLoading={glassware.isLoading}
        error={glassware.isError ? apiErrorMessage(glassware.error) : undefined}
        empty="No glassware yet. Create one to get started."
      />

      <Dialog open={editing !== null} onClose={() => setEditing(null)} fullWidth maxWidth="md">
        <DialogTitle>{editing === 'new' ? 'New glassware' : `Edit ${editing?.name ?? ''}`}</DialogTitle>
        <DialogContent>
          {editing && (
            <Box sx={{ pt: 1 }}>
              <GlasswareEditor
                glass={editing === 'new' ? BLANK : editing}
                palettes={palettes.data ?? []}
                pending={save.isPending}
                onSave={(draft) => save.mutate(draft)}
                onCancel={() => setEditing(null)}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        destructive
        pending={remove.isPending}
        title={`Delete ${deleting?.name ?? ''}?`}
        body="Anything still pointing at this glassware will lose its shape. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleting && remove.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </Stack>
  );
};

export default GlasswareSection;
```

- [ ] **Step 13: Register the section**

In `admin/src/sections/registry.tsx`, import `GlasswareSection` and replace the glassware
placeholder element with `<GlasswareSection />`.

- [ ] **Step 14: Run the suite and lint**

Run: `cd admin && npm run lint && npm test`
Expected: all green.

- [ ] **Step 15: Commit**

```bash
git add admin/src/sections/glassware/ admin/src/sections/registry.tsx admin/src/test/setup.ts
git commit -m "feat(admin): glassware curation with path validation and live preview"
```

---

### Task 10: Default recommendations section

**Files:**
- Create: `admin/src/sections/recommendations/RecommendationsSection.tsx`, `admin/src/sections/recommendations/RecommendationRow.tsx`, `admin/src/sections/recommendations/NewRecommendationDialog.tsx`, `admin/src/sections/recommendations/reorder.ts`
- Modify: `admin/src/sections/registry.tsx`, `admin/src/test/setup.ts`, `admin/src/api/queries.ts`
- Test: `admin/src/sections/recommendations/reorder.test.ts`, `admin/src/sections/recommendations/RecommendationsSection.test.tsx`, `admin/src/sections/recommendations/NewRecommendationDialog.test.tsx`

**Interfaces:**
- Consumes: the recommendation functions in `api/admin.ts` (Task 4), `useDefaultRecommendations`, `useAlcoholTypes`, `useBrands`, `useConsumptionTypes`, `usePalettes`, `useGlassware` (Task 7).
- Produces:
  - `moveItem<T>(items: readonly T[], from: number, to: number): T[]` and `toEdits(rows: readonly Recommendation[]): RecommendationEdit[]` from `reorder.ts`
  - `RecommendationsSection`, registered at `/recommendations`
  - Two new hooks added to `api/queries.ts`: `useSubtypes(alcoholTypeId)` and `useVolumes(alcoholTypeId)`, both accepting `undefined` and disabled until an id is chosen.

- [ ] **Step 1: Add the row-geometry stub to `admin/src/test/setup.ts`**

dnd-kit computes drop targets from real geometry, and jsdom gives every element a zero-size
rect, so without this a keyboard reorder resolves every row to the same point and the list
never moves. This is `web/src/test/setup.ts`'s stub with the data attribute renamed. Append:

```ts
/**
 * jsdom gives every element a zero-size rect, and dnd-kit's sortable computes its drop
 * target from real geometry. Without a size, a keyboard reorder resolves every row to
 * the same point and the list never moves. Stubbing only rows keeps the fiction as
 * small as possible, except for one thing rows alone cannot supply: restrictToParentElement
 * reads the dragged row's own DOM parent's rect to clamp the transform, and a real
 * (zero-size) rect there clamps every reorder back to a no-op. So an element that is an
 * ancestor of stubbed rows gets a rect enclosing them; every other element still gets
 * the real jsdom rect, which is what keeps this stub out of unrelated layout tests.
 */
const ROW_HEIGHT = 48;
const realRect = Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect = function getBoundingClientRect(this: Element) {
  const row = this instanceof HTMLElement ? this.dataset.recommendationRow : undefined;
  if (row !== undefined) {
    const index = Number(this.getAttribute('data-recommendation-index') ?? 0);
    const top = index * ROW_HEIGHT;
    return {
      x: 0, y: top, top, left: 0, right: 320, bottom: top + ROW_HEIGHT,
      width: 320, height: ROW_HEIGHT, toJSON: () => ({}),
    } as DOMRect;
  }
  const descendantRows = this.querySelectorAll?.('[data-recommendation-row]') ?? [];
  if (descendantRows.length > 0) {
    const count = descendantRows.length;
    return {
      x: 0, y: 0, top: 0, left: 0, right: 320, bottom: count * ROW_HEIGHT,
      width: 320, height: count * ROW_HEIGHT, toJSON: () => ({}),
    } as DOMRect;
  }
  return realRect.call(this);
};
```

- [ ] **Step 2: Write the failing test for the reorder helpers**

`admin/src/sections/recommendations/reorder.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { moveItem, toEdits } from './reorder';

const rows = [
  { id: 1, name: 'A', alcoholTypeId: 1, alcoholVolumeId: 1 },
  { id: 2, name: 'B', alcoholTypeId: 1, alcoholVolumeId: 1 },
  { id: 3, name: 'C', alcoholTypeId: 1, alcoholVolumeId: 1 },
];

describe('moveItem', () => {
  it('moves an item down', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('moves an item up', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('returns an equal list when the indices match', () => {
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input, so an optimistic rollback still has the old order', () => {
    const input = ['a', 'b', 'c'];
    moveItem(input, 0, 2);
    expect(input).toEqual(['a', 'b', 'c']);
  });

  it('ignores an out of range index rather than producing undefined holes', () => {
    expect(moveItem(['a', 'b'], 5, 0)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 0, 9)).toEqual(['a', 'b']);
  });
});

describe('toEdits', () => {
  it('sends id and name for every surviving row, in order', () => {
    expect(toEdits(rows)).toEqual([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
      { id: 3, name: 'C' },
    ]);
  });

  it('carries no other field, because the endpoint only reads these two', () => {
    expect(Object.keys(toEdits(rows)[0])).toEqual(['id', 'name']);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd admin && npx vitest run src/sections/recommendations/reorder.test.ts`
Expected: FAIL, cannot resolve `./reorder`.

- [ ] **Step 4: Write `admin/src/sections/recommendations/reorder.ts`**

```ts
import type { Recommendation, RecommendationEdit } from '../../types/api';

/**
 * Moves one item, returning a new array.
 *
 * Non-mutating on purpose: the optimistic reorder needs the previous array intact to
 * roll back to when the PATCH fails, and a splice in place would have already
 * destroyed it.
 */
export const moveItem = <T>(items: readonly T[], from: number, to: number): T[] => {
  const next = [...items];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

/**
 * The PATCH body: every surviving row's id and name, in the order they should end up in.
 *
 * The name is always sent, changed or not, so the server never has to diff. Deleted rows
 * are simply absent, which is why a pending delete must be flushed before this is called.
 */
export const toEdits = (rows: readonly Recommendation[]): RecommendationEdit[] =>
  rows.map((row) => ({ id: row.id, name: row.name }));
```

- [ ] **Step 5: Run it to verify it passes**

Run: `cd admin && npx vitest run src/sections/recommendations/reorder.test.ts`
Expected: 7 passed.

- [ ] **Step 6: Add the dependent catalogue hooks to `admin/src/api/queries.ts`**

Add the three names to the existing `import { ... } from './admin'` at the top of the file,
which already imports `getAlcoholTypes` and the rest. They are `getAlcoholSubtypes`,
`getAlcoholVolumes` and `getBeerFlavours`. Then append the hooks below the existing ones:

```ts
/**
 * The dependent lists. `enabled` keeps them from firing with an undefined id, which
 * would otherwise request /v1/admin/alcohol/types/undefined/subtypes and 404 every time
 * the dialog opens before a type is chosen.
 */
export const useSubtypes = (alcoholTypeId: number | undefined) =>
  useQuery({
    queryKey: queryKeys.subtypes(alcoholTypeId ?? -1),
    queryFn: () => getAlcoholSubtypes(alcoholTypeId!),
    enabled: alcoholTypeId !== undefined,
  });

export const useVolumes = (alcoholTypeId: number | undefined) =>
  useQuery({
    queryKey: queryKeys.volumes(alcoholTypeId ?? -1),
    queryFn: () => getAlcoholVolumes(alcoholTypeId!),
    enabled: alcoholTypeId !== undefined,
  });

export const useFlavours = (brandId: number | undefined) =>
  useQuery({
    queryKey: queryKeys.flavours(brandId ?? -1),
    queryFn: () => getBeerFlavours(brandId!),
    enabled: brandId !== undefined,
  });
```

- [ ] **Step 7: Write the failing test for the create dialog**

`admin/src/sections/recommendations/NewRecommendationDialog.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/test-utils';
import { NewRecommendationDialog } from './NewRecommendationDialog';
import * as api from '../../api/admin';

vi.mock('../../api/admin');

const owned = { userId: null, shared: true };

describe('NewRecommendationDialog', () => {
  beforeEach(() => {
    vi.mocked(api.getAlcoholTypes).mockResolvedValue([
      { ...owned, id: 1, name: 'Beer', volumeIds: [10], colorPaletteId: 1, glasswareId: 1 },
      { ...owned, id: 2, name: 'Wine', volumeIds: [11], colorPaletteId: 1, glasswareId: 1 },
    ]);
    vi.mocked(api.getAlcoholVolumes).mockResolvedValue([
      { ...owned, id: 10, name: 'Pint', volume: 500 },
    ]);
    vi.mocked(api.getAlcoholSubtypes).mockResolvedValue([
      { ...owned, id: 20, alcoholTypeId: 1, name: 'Lager' },
    ]);
    vi.mocked(api.getBrands).mockResolvedValue([]);
    vi.mocked(api.getConsumptionTypes).mockResolvedValue([]);
  });

  it('blocks save until a name, type and volume are chosen', async () => {
    renderWithProviders(<NewRecommendationDialog open onClose={vi.fn()} onCreate={vi.fn()} />);
    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Name'), 'House pint');
    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled();
  });

  it('loads volumes only after an alcohol type is chosen', async () => {
    renderWithProviders(<NewRecommendationDialog open onClose={vi.fn()} onCreate={vi.fn()} />);
    expect(api.getAlcoholVolumes).not.toHaveBeenCalled();

    await userEvent.click(await screen.findByLabelText('Alcohol type'));
    await userEvent.click(screen.getByRole('option', { name: 'Beer' }));

    await waitFor(() => expect(api.getAlcoholVolumes).toHaveBeenCalledWith(1));
  });

  it('submits the composed recommendation', async () => {
    const onCreate = vi.fn();
    renderWithProviders(<NewRecommendationDialog open onClose={vi.fn()} onCreate={onCreate} />);

    await userEvent.type(screen.getByLabelText('Name'), 'House pint');
    await userEvent.click(await screen.findByLabelText('Alcohol type'));
    await userEvent.click(screen.getByRole('option', { name: 'Beer' }));
    await userEvent.click(await screen.findByLabelText('Volume'));
    await userEvent.click(screen.getByRole('option', { name: /pint/i }));

    await userEvent.click(screen.getByRole('button', { name: /add/i }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'House pint', alcoholTypeId: 1, alcoholVolumeId: 10 })
    );
  });

  it('clears the volume when the alcohol type changes, so a stale id cannot be submitted', async () => {
    const onCreate = vi.fn();
    renderWithProviders(<NewRecommendationDialog open onClose={vi.fn()} onCreate={onCreate} />);

    await userEvent.type(screen.getByLabelText('Name'), 'House pint');
    await userEvent.click(await screen.findByLabelText('Alcohol type'));
    await userEvent.click(screen.getByRole('option', { name: 'Beer' }));
    await userEvent.click(await screen.findByLabelText('Volume'));
    await userEvent.click(screen.getByRole('option', { name: /pint/i }));

    await userEvent.click(screen.getByLabelText('Alcohol type'));
    await userEvent.click(screen.getByRole('option', { name: 'Wine' }));

    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled();
  });
});
```

- [ ] **Step 8: Run it to verify it fails**

Run: `cd admin && npx vitest run src/sections/recommendations/NewRecommendationDialog.test.tsx`
Expected: FAIL, cannot resolve `./NewRecommendationDialog`.

- [ ] **Step 9: Write `admin/src/sections/recommendations/NewRecommendationDialog.tsx`**

```tsx
import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import {
  useAlcoholTypes,
  useBrands,
  useConsumptionTypes,
  useFlavours,
  useSubtypes,
  useVolumes,
} from '../../api/queries';
import type { NewRecommendation } from '../../types/api';

interface Props {
  open: boolean;
  pending?: boolean;
  onClose: () => void;
  onCreate: (draft: NewRecommendation) => void;
}

/**
 * Composes a default recommendation.
 *
 * The selects cascade, and changing a parent clears its children. Without that, picking
 * Beer, then a pint, then switching to Wine would submit a wine recommendation carrying
 * a beer volume id: the server would accept it and every user would get a broken default
 * nobody could explain.
 */
export const NewRecommendationDialog = ({ open, pending = false, onClose, onCreate }: Props) => {
  const [name, setName] = useState('');
  const [alcoholTypeId, setAlcoholTypeId] = useState<number | undefined>();
  const [alcoholSubtypeId, setAlcoholSubtypeId] = useState<number | undefined>();
  const [alcoholVolumeId, setAlcoholVolumeId] = useState<number | undefined>();
  const [brandId, setBrandId] = useState<number | undefined>();
  const [beerFlavourId, setBeerFlavourId] = useState<number | undefined>();
  const [consumptionTypeId, setConsumptionTypeId] = useState<number | undefined>();

  const alcoholTypes = useAlcoholTypes();
  const subtypes = useSubtypes(alcoholTypeId);
  const volumes = useVolumes(alcoholTypeId);
  const brands = useBrands();
  const flavours = useFlavours(brandId);
  const consumptionTypes = useConsumptionTypes();

  const chooseType = (next: number) => {
    setAlcoholTypeId(next);
    setAlcoholSubtypeId(undefined);
    setAlcoholVolumeId(undefined);
  };

  const chooseBrand = (next: number) => {
    setBrandId(next);
    setBeerFlavourId(undefined);
  };

  const valid =
    name.trim().length > 0 && alcoholTypeId !== undefined && alcoholVolumeId !== undefined;

  const submit = () => {
    if (!valid) return;
    onCreate({
      name: name.trim(),
      alcoholTypeId,
      alcoholVolumeId,
      ...(alcoholSubtypeId !== undefined ? { alcoholSubtypeId } : {}),
      ...(brandId !== undefined ? { brandId } : {}),
      ...(beerFlavourId !== undefined ? { beerFlavourId } : {}),
      ...(consumptionTypeId !== undefined ? { consumptionTypeId } : {}),
    });
  };

  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add a default recommendation</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} />

          <TextField
            select
            label="Alcohol type"
            value={alcoholTypeId ?? ''}
            onChange={(event) => chooseType(Number(event.target.value))}
          >
            {(alcoholTypes.data ?? []).map((type) => (
              <MenuItem key={type.id} value={type.id}>
                {type.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Subtype"
            value={alcoholSubtypeId ?? ''}
            disabled={alcoholTypeId === undefined}
            onChange={(event) => setAlcoholSubtypeId(Number(event.target.value))}
            helperText="Optional."
          >
            {(subtypes.data ?? []).map((subtype) => (
              <MenuItem key={subtype.id} value={subtype.id}>
                {subtype.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Volume"
            value={alcoholVolumeId ?? ''}
            disabled={alcoholTypeId === undefined}
            onChange={(event) => setAlcoholVolumeId(Number(event.target.value))}
          >
            {(volumes.data ?? []).map((volume) => (
              <MenuItem key={volume.id} value={volume.id}>
                {volume.name} ({volume.volume} ml)
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Brand"
            value={brandId ?? ''}
            onChange={(event) => chooseBrand(Number(event.target.value))}
            helperText="Optional."
          >
            {(brands.data ?? []).map((brand) => (
              <MenuItem key={brand.id} value={brand.id}>
                {brand.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Flavour"
            value={beerFlavourId ?? ''}
            disabled={brandId === undefined}
            onChange={(event) => setBeerFlavourId(Number(event.target.value))}
            helperText="Optional."
          >
            {(flavours.data ?? []).map((flavour) => (
              <MenuItem key={flavour.id} value={flavour.id}>
                {flavour.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Consumption type"
            value={consumptionTypeId ?? ''}
            onChange={(event) => setConsumptionTypeId(Number(event.target.value))}
            helperText="Optional."
          >
            {(consumptionTypes.data ?? []).map((type) => (
              <MenuItem key={type.id} value={type.id}>
                {type.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={!valid || pending}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewRecommendationDialog;
```

- [ ] **Step 10: Write the failing test for the section**

`admin/src/sections/recommendations/RecommendationsSection.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/test-utils';
import { RecommendationsSection } from './RecommendationsSection';
import * as api from '../../api/admin';

vi.mock('../../api/admin');

const defaults = [
  { id: 1, name: 'House pint', alcoholTypeId: 1, alcoholVolumeId: 10 },
  { id: 2, name: 'House red', alcoholTypeId: 2, alcoholVolumeId: 11 },
];

describe('RecommendationsSection', () => {
  beforeEach(() => {
    vi.mocked(api.getDefaultRecommendations).mockResolvedValue(defaults);
    vi.mocked(api.getAlcoholTypes).mockResolvedValue([]);
    vi.mocked(api.getBrands).mockResolvedValue([]);
    vi.mocked(api.getConsumptionTypes).mockResolvedValue([]);
  });

  it('lists the defaults in server order', async () => {
    renderWithProviders(<RecommendationsSection />);
    const rows = await screen.findAllByTestId(/^recommendation-/);
    expect(rows.map((row) => row.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining('House pint'), expect.stringContaining('House red')])
    );
  });

  it('renames a row and sends the full ordered list', async () => {
    vi.mocked(api.reorderDefaultRecommendations).mockResolvedValue(defaults);
    renderWithProviders(<RecommendationsSection />);

    const name = await screen.findByLabelText('Name of House pint');
    await userEvent.clear(name);
    await userEvent.type(name, 'Local pint');
    await userEvent.tab();

    await waitFor(() =>
      expect(api.reorderDefaultRecommendations).toHaveBeenCalledWith([
        { id: 1, name: 'Local pint' },
        { id: 2, name: 'House red' },
      ])
    );
  });

  it('reorders with the keyboard and persists the new order', async () => {
    vi.mocked(api.reorderDefaultRecommendations).mockResolvedValue(defaults);
    renderWithProviders(<RecommendationsSection />);

    const handle = await screen.findByLabelText('Reorder House pint');
    handle.focus();
    await userEvent.keyboard('{ }');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ }');

    await waitFor(() =>
      expect(api.reorderDefaultRecommendations).toHaveBeenCalledWith([
        { id: 2, name: 'House red' },
        { id: 1, name: 'House pint' },
      ])
    );
  });

  it('rolls the order back and reports the error when the reorder fails', async () => {
    vi.mocked(api.reorderDefaultRecommendations).mockRejectedValue(new Error('network'));
    renderWithProviders(<RecommendationsSection />);

    const handle = await screen.findByLabelText('Reorder House pint');
    handle.focus();
    await userEvent.keyboard('{ }');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ }');

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await waitFor(() => {
      const rows = screen.getAllByTestId(/^recommendation-/);
      expect(rows[0]).toHaveTextContent('House pint');
    });
  });

  it('deletes a row after confirmation', async () => {
    vi.mocked(api.deleteDefaultRecommendation).mockResolvedValue(undefined);
    renderWithProviders(<RecommendationsSection />);

    await userEvent.click(await screen.findByLabelText('Delete House red'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(api.deleteDefaultRecommendation).toHaveBeenCalledWith(2));
  });

  it('creates a default through the dialog', async () => {
    vi.mocked(api.createDefaultRecommendation).mockResolvedValue({ ...defaults[0], id: 3 });
    vi.mocked(api.getAlcoholTypes).mockResolvedValue([
      { userId: null, shared: true, id: 1, name: 'Beer', volumeIds: [10], colorPaletteId: 1, glasswareId: 1 },
    ]);
    vi.mocked(api.getAlcoholVolumes).mockResolvedValue([
      { userId: null, shared: true, id: 10, name: 'Pint', volume: 500 },
    ]);
    vi.mocked(api.getAlcoholSubtypes).mockResolvedValue([]);

    renderWithProviders(<RecommendationsSection />);

    await userEvent.click(await screen.findByRole('button', { name: /add default/i }));
    await userEvent.type(screen.getByLabelText('Name'), 'New default');
    await userEvent.click(await screen.findByLabelText('Alcohol type'));
    await userEvent.click(screen.getByRole('option', { name: 'Beer' }));
    await userEvent.click(await screen.findByLabelText('Volume'));
    await userEvent.click(screen.getByRole('option', { name: /pint/i }));
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() =>
      expect(api.createDefaultRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New default' })
      )
    );
  });
});
```

- [ ] **Step 11: Run it to verify it fails**

Run: `cd admin && npx vitest run src/sections/recommendations/RecommendationsSection.test.tsx`
Expected: FAIL, cannot resolve `./RecommendationsSection`.

- [ ] **Step 12: Write `admin/src/sections/recommendations/RecommendationRow.tsx`**

```tsx
import { IconButton, Paper, Stack, TextField } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Recommendation } from '../../types/api';

interface Props {
  recommendation: Recommendation;
  index: number;
  onRename: (name: string) => void;
  onDelete: () => void;
}

/**
 * One default. The drag handle is its own control rather than the whole row, so the
 * name field stays selectable with a pointer.
 *
 * The data attributes are what the jsdom geometry stub in test/setup.ts keys on. They
 * are load-bearing for the reorder tests and should not be renamed without updating it.
 */
export const RecommendationRow = ({ recommendation, index, onRename, onDelete }: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: recommendation.id,
  });

  return (
    <Paper
      ref={setNodeRef}
      data-testid={`recommendation-${recommendation.id}`}
      data-recommendation-row=""
      data-recommendation-index={index}
      sx={{
        p: 1,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <IconButton
          aria-label={`Reorder ${recommendation.name}`}
          size="small"
          {...attributes}
          {...listeners}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
        <TextField
          label={`Name of ${recommendation.name}`}
          defaultValue={recommendation.name}
          onBlur={(event) => {
            const next = event.target.value.trim();
            if (next && next !== recommendation.name) onRename(next);
          }}
          sx={{ flex: 1 }}
        />
        <IconButton aria-label={`Delete ${recommendation.name}`} onClick={onDelete}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Paper>
  );
};

export default RecommendationRow;
```

- [ ] **Step 13: Write `admin/src/sections/recommendations/RecommendationsSection.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Stack, Typography } from '@mui/material';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  createDefaultRecommendation,
  deleteDefaultRecommendation,
  reorderDefaultRecommendations,
} from '../../api/admin';
import { queryKeys, useDefaultRecommendations } from '../../api/queries';
import { apiErrorMessage } from '../../api/errors';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { RecommendationRow } from './RecommendationRow';
import { NewRecommendationDialog } from './NewRecommendationDialog';
import { moveItem, toEdits } from './reorder';
import type { NewRecommendation, Recommendation } from '../../types/api';

export const RecommendationsSection = () => {
  const queryClient = useQueryClient();
  const query = useDefaultRecommendations();

  /**
   * A local copy of the order, so a drag can update the list on the frame it happens
   * rather than after a round trip. The effect resyncs it whenever the server's list
   * changes, which is what makes a rollback a matter of restoring the query data.
   */
  const [rows, setRows] = useState<Recommendation[]>([]);
  const [deleting, setDeleting] = useState<Recommendation | null>(null);
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (query.data) setRows(query.data);
  }, [query.data]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const persist = useMutation({
    mutationFn: (next: Recommendation[]) => reorderDefaultRecommendations(toEdits(next)),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.recommendations });
    },
    onError: (error) => {
      setActionError(apiErrorMessage(error));
      setRows(query.data ?? []);
    },
  });

  const remove = useMutation({
    mutationFn: (recommendation: Recommendation) => deleteDefaultRecommendation(recommendation.id),
    onSuccess: async () => {
      setActionError(null);
      setDeleting(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.recommendations });
    },
    onError: (error) => {
      setActionError(apiErrorMessage(error));
      setDeleting(null);
    },
  });

  const create = useMutation({
    mutationFn: (draft: NewRecommendation) => createDefaultRecommendation(draft),
    onSuccess: async () => {
      setActionError(null);
      setAdding(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.recommendations });
    },
    onError: (error) => setActionError(apiErrorMessage(error)),
  });

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = rows.findIndex((row) => row.id === active.id);
    const to = rows.findIndex((row) => row.id === over.id);
    const next = moveItem(rows, from, to);
    setRows(next);
    persist.mutate(next);
  };

  const rename = (id: number, name: string) => {
    const next = rows.map((row) => (row.id === id ? { ...row, name } : row));
    setRows(next);
    persist.mutate(next);
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h1" component="h1">
          Default recommendations
        </Typography>
        <Button variant="contained" onClick={() => setAdding(true)}>
          Add default
        </Button>
      </Stack>

      <Typography color="text.secondary">
        These are what every user sees before they have created any of their own. The order
        here is the order they appear in.
      </Typography>

      {actionError && <Alert severity="error">{actionError}</Alert>}
      {query.isError && <Alert severity="error">{apiErrorMessage(query.error)}</Alert>}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
          <Stack spacing={1}>
            {rows.map((recommendation, index) => (
              <RecommendationRow
                key={recommendation.id}
                recommendation={recommendation}
                index={index}
                onRename={(name) => rename(recommendation.id, name)}
                onDelete={() => setDeleting(recommendation)}
              />
            ))}
          </Stack>
        </SortableContext>
      </DndContext>

      {!query.isLoading && rows.length === 0 && (
        <Typography color="text.secondary">No defaults yet. Add one to get started.</Typography>
      )}

      <NewRecommendationDialog
        open={adding}
        pending={create.isPending}
        onClose={() => setAdding(false)}
        onCreate={(draft) => create.mutate(draft)}
      />

      <ConfirmDialog
        open={deleting !== null}
        destructive
        pending={remove.isPending}
        title={`Delete ${deleting?.name ?? ''}?`}
        body="New users will no longer see this default. Existing users keep their own copies."
        confirmLabel="Delete"
        onConfirm={() => deleting && remove.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </Stack>
  );
};

export default RecommendationsSection;
```

- [ ] **Step 14: Register the section**

In `admin/src/sections/registry.tsx`, import `RecommendationsSection` and replace the
recommendations placeholder element with `<RecommendationsSection />`.

- [ ] **Step 15: Run the suite and lint**

Run: `cd admin && npm run lint && npm test`
Expected: all green. If the keyboard reorder test fails with the list unchanged, the geometry
stub from step 1 is not matching: check that `data-recommendation-row` and
`data-recommendation-index` are both present on the rendered row.

- [ ] **Step 16: Commit**

```bash
git add admin/src/sections/recommendations/ admin/src/sections/registry.tsx admin/src/api/queries.ts admin/src/test/setup.ts
git commit -m "feat(admin): default recommendation curation"
```

---

### Task 11: Catalogue review section

**Files:**
- Create: `admin/src/sections/catalogue/catalogueTabs.ts`, `admin/src/sections/catalogue/CatalogueTable.tsx`, `admin/src/sections/catalogue/CatalogueSection.tsx`, `admin/src/sections/catalogue/usePublish.ts`
- Modify: `admin/src/sections/registry.tsx`
- Test: `admin/src/sections/catalogue/catalogueTabs.test.ts`, `admin/src/sections/catalogue/CatalogueSection.test.tsx`

**Interfaces:**
- Consumes: `CATALOGUE_PATHS`, `CatalogueKind`, `updateCatalogueEntry`, `publishCatalogueEntry`, `unpublishCatalogueEntry` (Task 4), the catalogue hooks (Tasks 7 and 10), `ResponsiveTable` and `ConfirmDialog` (Task 7).
- Produces: `CATALOGUE_TABS: CatalogueTab[]` and `ownerLabel(entry, currentUserId)` from `catalogueTabs.ts`, `CatalogueSection` registered at `/catalogue`.

- [ ] **Step 1: Write the failing test for the tab metadata and owner label**

`admin/src/sections/catalogue/catalogueTabs.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CATALOGUE_TABS, ownerLabel, isUserDefined } from './catalogueTabs';
import { CATALOGUE_PATHS } from '../../api/admin';

describe('CATALOGUE_TABS', () => {
  it('covers every catalogue kind the API knows about', () => {
    expect(CATALOGUE_TABS.map((tab) => tab.kind).sort()).toEqual(
      Object.keys(CATALOGUE_PATHS).sort()
    );
  });

  it('gives every tab a label', () => {
    for (const tab of CATALOGUE_TABS) {
      expect(tab.label.trim().length).toBeGreaterThan(0);
    }
  });

  it('marks which tabs need a parent id chosen before they can list anything', () => {
    const byKind = Object.fromEntries(CATALOGUE_TABS.map((tab) => [tab.kind, tab]));
    expect(byKind.subtypes.parent).toBe('alcoholTypes');
    expect(byKind.volumes.parent).toBe('alcoholTypes');
    expect(byKind.flavours.parent).toBe('brands');
    expect(byKind.alcoholTypes.parent).toBeUndefined();
  });
});

describe('ownerLabel', () => {
  it('calls a published row shared, whoever wrote it', () => {
    expect(ownerLabel({ userId: 'u-9', shared: true }, 'u-1')).toBe('Shared');
  });

  it('calls the current admin own row Mine', () => {
    expect(ownerLabel({ userId: 'u-1', shared: false }, 'u-1')).toBe('Mine');
  });

  it('calls anyone else a user', () => {
    expect(ownerLabel({ userId: 'u-9', shared: false }, 'u-1')).toBe('User');
  });

  it('handles a row with no owner', () => {
    expect(ownerLabel({ userId: null, shared: true }, 'u-1')).toBe('Shared');
    expect(ownerLabel({ userId: null, shared: false }, 'u-1')).toBe('Unowned');
  });
});

describe('isUserDefined', () => {
  it('is true for an unpublished row owned by somebody', () => {
    expect(isUserDefined({ userId: 'u-9', shared: false })).toBe(true);
  });

  it('is false once the row is published', () => {
    expect(isUserDefined({ userId: 'u-9', shared: true })).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd admin && npx vitest run src/sections/catalogue/catalogueTabs.test.ts`
Expected: FAIL, cannot resolve `./catalogueTabs`.

- [ ] **Step 3: Write `admin/src/sections/catalogue/catalogueTabs.ts`**

```ts
import type { CatalogueKind } from '../../api/admin';
import type { AdminOwned } from '../../types/api';

export interface CatalogueTab {
  kind: CatalogueKind;
  label: string;
  /**
   * The kind whose row has to be chosen before this list can be fetched. Subtypes and
   * volumes hang off an alcohol type, flavours off a brand: their endpoints are nested,
   * so there is no "all subtypes" call to make.
   */
  parent?: CatalogueKind;
  /** Whether rows of this kind carry a palette assignment that can be edited here. */
  hasPalette: boolean;
  /** Whether rows of this kind carry a glassware assignment. */
  hasGlassware: boolean;
}

export const CATALOGUE_TABS: CatalogueTab[] = [
  { kind: 'alcoholTypes', label: 'Alcohol types', hasPalette: true, hasGlassware: true },
  { kind: 'subtypes', label: 'Subtypes', parent: 'alcoholTypes', hasPalette: true, hasGlassware: true },
  { kind: 'volumes', label: 'Volumes', parent: 'alcoholTypes', hasPalette: false, hasGlassware: false },
  { kind: 'brands', label: 'Brands', hasPalette: true, hasGlassware: false },
  { kind: 'flavours', label: 'Flavours', parent: 'brands', hasPalette: true, hasGlassware: false },
  { kind: 'consumptionTypes', label: 'Consumption types', hasPalette: false, hasGlassware: true },
];

/**
 * What the owner column shows.
 *
 * Shared wins over the author, because once a row is published its author is trivia and
 * its availability is the thing an administrator is scanning for. The author is still
 * carried in the data, which is what makes unpublish meaningful.
 */
export const ownerLabel = (entry: AdminOwned, currentUserId: string | undefined): string => {
  if (entry.shared) return 'Shared';
  if (entry.userId === null) return 'Unowned';
  if (entry.userId === currentUserId) return 'Mine';
  return 'User';
};

/** A row somebody created for themselves and nobody has published yet. */
export const isUserDefined = (entry: AdminOwned): boolean => !entry.shared && entry.userId !== null;
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd admin && npx vitest run src/sections/catalogue/catalogueTabs.test.ts`
Expected: 9 passed.

- [ ] **Step 5: Write `admin/src/sections/catalogue/usePublish.ts`**

```ts
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { publishCatalogueEntry, unpublishCatalogueEntry, type CatalogueKind } from '../../api/admin';
import type { AdminOwned } from '../../types/api';

interface Options {
  kind: CatalogueKind;
  queryKey: QueryKey;
  onError: (message: string) => void;
}

type Row = AdminOwned & { id: number };

/**
 * Publish and unpublish, applied optimistically.
 *
 * Optimistic here and not elsewhere because this is the one action whose latency is felt
 * as lag rather than as saving: an administrator publishes a run of rows in sequence, and
 * a round trip between each one turns a minute of review into five.
 *
 * The rollback restores the exact snapshot taken before the mutation, so a failure in the
 * middle of a run cannot leave a row showing a state the server never accepted.
 */
export const usePublish = ({ kind, queryKey, onError }: Options) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, publish }: { id: number; publish: boolean }) =>
      publish ? publishCatalogueEntry(kind, id) : unpublishCatalogueEntry(kind, id),

    onMutate: async ({ id, publish }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Row[]>(queryKey);
      queryClient.setQueryData<Row[]>(queryKey, (rows) =>
        rows?.map((row) => (row.id === id ? { ...row, shared: publish } : row))
      );
      return { previous };
    },

    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      onError(error instanceof Error ? error.message : 'Publishing failed.');
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
};

export default usePublish;
```

- [ ] **Step 6: Write the failing test for the section**

`admin/src/sections/catalogue/CatalogueSection.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/test-utils';
import { CatalogueSection } from './CatalogueSection';
import * as api from '../../api/admin';

vi.mock('../../api/admin', async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    getAlcoholTypes: vi.fn(),
    getAlcoholSubtypes: vi.fn(),
    getAlcoholVolumes: vi.fn(),
    getBrands: vi.fn(),
    getBeerFlavours: vi.fn(),
    getConsumptionTypes: vi.fn(),
    getColorPalettes: vi.fn(),
    getGlassware: vi.fn(),
    updateCatalogueEntry: vi.fn(),
    publishCatalogueEntry: vi.fn(),
    unpublishCatalogueEntry: vi.fn(),
  };
});

vi.mock('../../auth/useAuth', () => ({
  useAuth: () => ({ userId: 'admin-1', username: 'curator' }),
}));

const types = [
  { userId: 'user-9', shared: false, id: 1, name: 'Mead', volumeIds: [], colorPaletteId: 1, glasswareId: 1 },
  { userId: null, shared: true, id: 2, name: 'Beer', volumeIds: [], colorPaletteId: 1, glasswareId: 1 },
  { userId: 'admin-1', shared: false, id: 3, name: 'My draft', volumeIds: [], colorPaletteId: 1, glasswareId: 1 },
];

describe('CatalogueSection', () => {
  beforeEach(() => {
    vi.mocked(api.getAlcoholTypes).mockResolvedValue(types);
    vi.mocked(api.getBrands).mockResolvedValue([]);
    vi.mocked(api.getConsumptionTypes).mockResolvedValue([]);
    vi.mocked(api.getColorPalettes).mockResolvedValue([
      { id: 1, name: 'Amber', field: '#e8c37e', inkLight: null, inkDark: '#1b1a17' },
      { id: 2, name: 'Slate', field: '#4a5057', inkLight: null, inkDark: '#f2ece1' },
    ]);
    vi.mocked(api.getGlassware).mockResolvedValue([
      { id: 1, name: 'Tumbler', g: 'M4 2 L8 20 Z', l: 'M5 10 L7 18 Z', f: null },
    ]);
  });

  it('shows only user-defined rows by default, because reviewing those is the job', async () => {
    renderWithProviders(<CatalogueSection />);
    expect(await screen.findByText('Mead')).toBeInTheDocument();
    expect(screen.getByText('My draft')).toBeInTheDocument();
    expect(screen.queryByText('Beer')).not.toBeInTheDocument();
  });

  it('shows everything when the filter is turned off', async () => {
    renderWithProviders(<CatalogueSection />);
    await screen.findByText('Mead');
    await userEvent.click(screen.getByLabelText(/user-defined only/i));
    expect(await screen.findByText('Beer')).toBeInTheDocument();
  });

  it('filters by name, and says so when nothing matches', async () => {
    renderWithProviders(<CatalogueSection />);
    await screen.findByText('Mead');

    await userEvent.type(screen.getByLabelText(/search by name/i), 'mea');
    expect(screen.getByText('Mead')).toBeInTheDocument();
    expect(screen.queryByText('My draft')).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/search by name/i), 'zzz');
    expect(await screen.findByText(/nothing matches the current filters/i)).toBeInTheDocument();
  });

  it('labels the owner of each row', async () => {
    renderWithProviders(<CatalogueSection />);
    await screen.findByText('Mead');
    expect(screen.getByTestId('owner-1')).toHaveTextContent('User');
    expect(screen.getByTestId('owner-3')).toHaveTextContent('Mine');
  });

  it('publishes a row after confirmation and updates it without waiting for a refetch', async () => {
    let resolvePublish: () => void = () => {};
    vi.mocked(api.publishCatalogueEntry).mockImplementation(
      () => new Promise<void>((resolve) => { resolvePublish = resolve; })
    );

    renderWithProviders(<CatalogueSection />);
    await screen.findByText('Mead');

    await userEvent.click(screen.getByLabelText('Publish Mead'));
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(api.publishCatalogueEntry).toHaveBeenCalledWith('alcoholTypes', 1));
    await waitFor(() => expect(screen.getByTestId('owner-1')).toHaveTextContent('Shared'));

    resolvePublish();
  });

  it('rolls the row back when publishing fails', async () => {
    vi.mocked(api.publishCatalogueEntry).mockRejectedValue(new Error('network'));

    renderWithProviders(<CatalogueSection />);
    await screen.findByText('Mead');

    await userEvent.click(screen.getByLabelText('Publish Mead'));
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('owner-1')).toHaveTextContent('User'));
  });

  it('renames a row through the patch endpoint', async () => {
    vi.mocked(api.updateCatalogueEntry).mockResolvedValue(undefined);
    renderWithProviders(<CatalogueSection />);

    const name = await screen.findByLabelText('Name of Mead');
    await userEvent.clear(name);
    await userEvent.type(name, 'Honey wine');
    await userEvent.tab();

    await waitFor(() =>
      expect(api.updateCatalogueEntry).toHaveBeenCalledWith('alcoholTypes', 1, { name: 'Honey wine' })
    );
  });

  it('changes a palette assignment through the patch endpoint', async () => {
    vi.mocked(api.updateCatalogueEntry).mockResolvedValue(undefined);
    renderWithProviders(<CatalogueSection />);

    await screen.findByText('Mead');
    await userEvent.click(screen.getByLabelText('Palette of Mead'));
    await userEvent.click(screen.getByRole('option', { name: 'Slate' }));

    await waitFor(() =>
      expect(api.updateCatalogueEntry).toHaveBeenCalledWith('alcoholTypes', 1, { colorPaletteId: 2 })
    );
  });

  it('asks for a parent before listing a nested kind', async () => {
    renderWithProviders(<CatalogueSection />);
    await screen.findByText('Mead');

    await userEvent.click(screen.getByRole('tab', { name: 'Subtypes' }));

    expect(screen.getByText(/choose an alcohol type/i)).toBeInTheDocument();
    expect(api.getAlcoholSubtypes).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `cd admin && npx vitest run src/sections/catalogue/CatalogueSection.test.tsx`
Expected: FAIL, cannot resolve `./CatalogueSection`.

- [ ] **Step 8: Write `admin/src/sections/catalogue/CatalogueTable.tsx`**

```tsx
import { Chip, IconButton, MenuItem, Stack, TextField, Tooltip } from '@mui/material';
import PublishIcon from '@mui/icons-material/Publish';
import UnpublishedIcon from '@mui/icons-material/UnpublishedOutlined';
import { ResponsiveTable, type Column } from '../../components/ResponsiveTable';
import { ownerLabel, type CatalogueTab } from './catalogueTabs';
import type { AdminOwned, ColorPalette, Glassware } from '../../types/api';

type Row = AdminOwned & {
  id: number;
  name: string;
  colorPaletteId?: number | null;
  glasswareId?: number | null;
};

interface Props {
  tab: CatalogueTab;
  rows: readonly Row[];
  palettes: readonly ColorPalette[];
  glassware: readonly Glassware[];
  currentUserId: string | undefined;
  isLoading: boolean;
  error?: string;
  /** Distinguishes "no rows match the filters" from "this kind has no rows at all". */
  emptyMessage?: string;
  onRename: (id: number, name: string) => void;
  onAssign: (id: number, changes: { colorPaletteId?: number; glasswareId?: number }) => void;
  onTogglePublish: (row: Row) => void;
}

export const CatalogueTable = ({
  tab,
  rows,
  palettes,
  glassware,
  currentUserId,
  isLoading,
  error,
  emptyMessage = 'Nothing to review here.',
  onRename,
  onAssign,
  onTogglePublish,
}: Props) => {
  const columns: Column<Row>[] = [
    {
      id: 'name',
      label: 'Name',
      render: (row) => (
        <TextField
          label={`Name of ${row.name}`}
          defaultValue={row.name}
          onBlur={(event) => {
            const next = event.target.value.trim();
            if (next && next !== row.name) onRename(row.id, next);
          }}
        />
      ),
    },
    {
      id: 'owner',
      label: 'Owner',
      render: (row) => (
        <Chip
          size="small"
          data-testid={`owner-${row.id}`}
          label={ownerLabel(row, currentUserId)}
          color={row.shared ? 'primary' : 'default'}
          variant={row.shared ? 'filled' : 'outlined'}
        />
      ),
    },
  ];

  if (tab.hasPalette) {
    columns.push({
      id: 'palette',
      label: 'Palette',
      render: (row) => (
        <TextField
          select
          label={`Palette of ${row.name}`}
          value={row.colorPaletteId ?? ''}
          onChange={(event) => onAssign(row.id, { colorPaletteId: Number(event.target.value) })}
          sx={{ minWidth: 140 }}
        >
          {palettes.map((palette) => (
            <MenuItem key={palette.id} value={palette.id}>
              {palette.name}
            </MenuItem>
          ))}
        </TextField>
      ),
    });
  }

  if (tab.hasGlassware) {
    columns.push({
      id: 'glassware',
      label: 'Glassware',
      render: (row) => (
        <TextField
          select
          label={`Glassware of ${row.name}`}
          value={row.glasswareId ?? ''}
          onChange={(event) => onAssign(row.id, { glasswareId: Number(event.target.value) })}
          sx={{ minWidth: 140 }}
        >
          {glassware.map((glass) => (
            <MenuItem key={glass.id} value={glass.id}>
              {glass.name}
            </MenuItem>
          ))}
        </TextField>
      ),
    });
  }

  columns.push({
    id: 'publish',
    label: 'Availability',
    align: 'right',
    render: (row) => (
      <Tooltip title={row.shared ? 'Make private again' : 'Make available to every user'}>
        <IconButton
          aria-label={`${row.shared ? 'Unpublish' : 'Publish'} ${row.name}`}
          onClick={() => onTogglePublish(row)}
        >
          {row.shared ? <UnpublishedIcon fontSize="small" /> : <PublishIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    ),
  });

  return (
    <Stack spacing={2}>
      <ResponsiveTable
        caption={tab.label}
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error}
        empty={emptyMessage}
      />
    </Stack>
  );
};

export default CatalogueTable;
```

- [ ] **Step 9: Write `admin/src/sections/catalogue/CatalogueSection.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  getAlcoholSubtypes,
  getAlcoholTypes,
  getAlcoholVolumes,
  getBeerFlavours,
  getBrands,
  getConsumptionTypes,
  updateCatalogueEntry,
  type CatalogueKind,
} from '../../api/admin';
import { queryKeys, useGlassware, usePalettes } from '../../api/queries';
import { apiErrorMessage } from '../../api/errors';
import { useAuth } from '../../auth/useAuth';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CATALOGUE_TABS, isUserDefined } from './catalogueTabs';
import { CatalogueTable } from './CatalogueTable';
import { usePublish } from './usePublish';
import type { AdminOwned } from '../../types/api';

type Row = AdminOwned & {
  id: number;
  name: string;
  colorPaletteId?: number | null;
  glasswareId?: number | null;
};

/** The fetcher and query key for a tab, given the parent row it hangs off, if any. */
const listFor = (kind: CatalogueKind, parentId: number | undefined) => {
  switch (kind) {
    case 'alcoholTypes':
      return { queryKey: queryKeys.alcoholTypes, queryFn: getAlcoholTypes };
    case 'brands':
      return { queryKey: queryKeys.brands, queryFn: getBrands };
    case 'consumptionTypes':
      return { queryKey: queryKeys.consumptionTypes, queryFn: getConsumptionTypes };
    case 'subtypes':
      return { queryKey: queryKeys.subtypes(parentId ?? -1), queryFn: () => getAlcoholSubtypes(parentId!) };
    case 'volumes':
      return { queryKey: queryKeys.volumes(parentId ?? -1), queryFn: () => getAlcoholVolumes(parentId!) };
    case 'flavours':
      return { queryKey: queryKeys.flavours(parentId ?? -1), queryFn: () => getBeerFlavours(parentId!) };
  }
};

export const CatalogueSection = () => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const [tabIndex, setTabIndex] = useState(0);
  const [parentId, setParentId] = useState<number | undefined>();
  const [userDefinedOnly, setUserDefinedOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [publishing, setPublishing] = useState<Row | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const tab = CATALOGUE_TABS[tabIndex];
  const palettes = usePalettes();
  const glassware = useGlassware();

  // The parent pickers. Both are cheap top-level lists and are always fetched, because a
  // tab switch should not have to wait for one.
  const alcoholTypes = useQuery({ queryKey: queryKeys.alcoholTypes, queryFn: getAlcoholTypes });
  const brands = useQuery({ queryKey: queryKeys.brands, queryFn: getBrands });

  const { queryKey, queryFn } = listFor(tab.kind, parentId);
  const needsParent = tab.parent !== undefined && parentId === undefined;

  const list = useQuery<Row[]>({
    queryKey,
    queryFn: queryFn as () => Promise<Row[]>,
    enabled: !needsParent,
  });

  /**
   * This is the one list in the application with no ceiling: it is every row every user has
   * created, and it only grows. A name filter is what makes it usable past the first screenful.
   *
   * ponytail: filtered client-side over the full list. Fine into the low thousands of rows;
   * past that this needs a server-side query parameter and pagination, not a faster filter.
   */
  const rows = useMemo(() => {
    const all = list.data ?? [];
    const visible = userDefinedOnly ? all.filter(isUserDefined) : all;
    const needle = search.trim().toLowerCase();
    return needle === '' ? visible : visible.filter((row) => row.name.toLowerCase().includes(needle));
  }, [list.data, userDefinedOnly, search]);

  const publish = usePublish({ kind: tab.kind, queryKey, onError: setActionError });

  const patch = useMutation({
    mutationFn: ({ id, changes }: { id: number; changes: Parameters<typeof updateCatalogueEntry>[2] }) =>
      updateCatalogueEntry(tab.kind, id, changes),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => setActionError(apiErrorMessage(error)),
  });

  const parentOptions = tab.parent === 'brands' ? (brands.data ?? []) : (alcoholTypes.data ?? []);
  const parentLabel = tab.parent === 'brands' ? 'Brand' : 'Alcohol type';

  return (
    <Stack spacing={3}>
      <Typography variant="h1" component="h1">
        Catalogue
      </Typography>
      <Typography color="text.secondary">
        Everything users have created, plus what has been published. Publishing makes an entry
        available to every user; the author is kept either way.
      </Typography>

      {actionError && <Alert severity="error">{actionError}</Alert>}

      <Tabs
        value={tabIndex}
        onChange={(_event, next: number) => {
          setTabIndex(next);
          setParentId(undefined);
        }}
        variant="scrollable"
        allowScrollButtonsMobile
      >
        {CATALOGUE_TABS.map((entry) => (
          <Tab key={entry.kind} label={entry.label} />
        ))}
      </Tabs>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
        {tab.parent && (
          <TextField
            select
            label={parentLabel}
            value={parentId ?? ''}
            onChange={(event) => setParentId(Number(event.target.value))}
            sx={{ minWidth: 220 }}
          >
            {parentOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.name}
              </MenuItem>
            ))}
          </TextField>
        )}
        <TextField
          label="Search by name"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ minWidth: 220 }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={userDefinedOnly}
              onChange={(event) => setUserDefinedOnly(event.target.checked)}
            />
          }
          label="User-defined only"
        />
        <Typography variant="body2" color="text.secondary">
          {rows.length} of {list.data?.length ?? 0}
        </Typography>
      </Stack>

      {needsParent ? (
        <Typography color="text.secondary">
          Choose an {parentLabel.toLowerCase()} to see its {tab.label.toLowerCase()}.
        </Typography>
      ) : (
        <CatalogueTable
          tab={tab}
          rows={rows}
          palettes={palettes.data ?? []}
          glassware={glassware.data ?? []}
          currentUserId={userId}
          isLoading={list.isLoading}
          error={list.isError ? apiErrorMessage(list.error) : undefined}
          onRename={(id, name) => patch.mutate({ id, changes: { name } })}
          onAssign={(id, changes) => patch.mutate({ id, changes })}
          emptyMessage={
            search.trim() !== '' || userDefinedOnly
              ? 'Nothing matches the current filters.'
              : 'Nothing to review here.'
          }
          onTogglePublish={(row) =>
            row.shared ? publish.mutate({ id: row.id, publish: false }) : setPublishing(row)
          }
        />
      )}

      <ConfirmDialog
        open={publishing !== null}
        pending={publish.isPending}
        title={`Publish ${publishing?.name ?? ''}?`}
        body={`${publishing?.name ?? 'This entry'} becomes available to every user. You can make it private again afterwards.`}
        confirmLabel="Publish"
        onConfirm={() => {
          if (publishing) publish.mutate({ id: publishing.id, publish: true });
          setPublishing(null);
        }}
        onCancel={() => setPublishing(null)}
      />
    </Stack>
  );
};

export default CatalogueSection;
```

- [ ] **Step 10: Register the section**

In `admin/src/sections/registry.tsx`, import `CatalogueSection` and replace the catalogue
placeholder element with `<CatalogueSection />`. Every placeholder is now gone; confirm the
file imports four real sections.

- [ ] **Step 11: Run the suite and lint**

Run: `cd admin && npm run lint && npm test`
Expected: all green.

- [ ] **Step 12: Commit**

```bash
git add admin/src/sections/catalogue/ admin/src/sections/registry.tsx
git commit -m "feat(admin): catalogue review and publishing"
```

---

### Task 12: Container image and Helm chart

**Files:**
- Create: `admin/Dockerfile`, `admin/nginx.conf`, `admin/docker-entrypoint.sh`, `admin/helm/drinksaver-admin/Chart.yaml`, `admin/helm/drinksaver-admin/values.yaml`, `admin/helm/drinksaver-admin/templates/*`, `deploy/values/admin-test.yaml`, `deploy/values/admin-prod.yaml`
- Test: a local `docker build` and `helm template`, plus a shell assertion on the entrypoint's output.

**Interfaces:**
- Consumes: the built `admin/dist` from Task 1's build script.
- Produces: the image `ghcr.io/alex-molnar/drinksaver-admin` and the chart `drinksaver-admin`, both referenced by Task 13's workflows.

- [ ] **Step 1: Write `admin/Dockerfile`**

```dockerfile
# Build stage
FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build the application. No environment configuration is baked in: the bundle reads
# window.__DRINKSAVER_ADMIN_CONFIG__, which docker-entrypoint.sh writes to /config.js at
# container start. One image therefore serves any environment.
RUN npm run build

# Production stage
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 2: Write `admin/nginx.conf`**

Identical to the web app's, plus a `X-Robots-Tag`. An admin panel on a public host should not
be indexed, and the meta tag in `index.html` does not cover the assets.

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # An admin panel on a public hostname should not be indexed. The meta tag in
    # index.html only covers the document; this covers every response.
    add_header X-Robots-Tag "noindex, nofollow" always;

    # This panel's buttons publish reference data to every user of the product. A framed
    # copy of it plus a misdirected click is the cheapest way to make an administrator
    # publish something they never read, so the page refuses to be framed at all.
    # frame-ancestors is the modern control; X-Frame-Options covers anything that ignores
    # it. The consumer app sets neither, which is defensible there and is not here.
    add_header Content-Security-Policy "frame-ancestors 'none'" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    # The admin hostname itself is worth not leaking to whatever an administrator clicks
    # through to, and this app links nowhere that needs a referrer.
    add_header Referrer-Policy "no-referrer" always;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;

    # SPA fallback - all routes go to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Runtime config: written at container start, so it must never be cached.
    # Exact-match locations outrank the regex block below.
    location = /config.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
```

- [ ] **Step 3: Write `admin/docker-entrypoint.sh`**

```sh
#!/bin/sh
set -eu

# Write runtime configuration into the static bundle before nginx starts.
#
# The React bundle reads window.__DRINKSAVER_ADMIN_CONFIG__ (see src/config.ts), so
# nothing environment-specific is baked in at build time and one image can be promoted
# from test to production unchanged.

CONFIG_FILE=/usr/share/nginx/html/config.js

API_URL="${API_URL:-http://localhost:8080}"
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8081/auth}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-drinksaver}"
KEYCLOAK_CLIENT_ID="${KEYCLOAK_CLIENT_ID:-drinksaver-admin}"

# Escape backslashes and double quotes so a stray character cannot break out of the
# generated string literal. Newlines are stripped rather than escaped: they cannot
# legitimately appear in a URL, realm, or client ID, and an unescaped one would make the
# whole file a SyntaxError, silently reverting the app to its localhost defaults.
escape() {
  printf '%s' "$1" | tr -d '\r\n' | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

cat > "$CONFIG_FILE" <<CONFIG
window.__DRINKSAVER_ADMIN_CONFIG__ = {
  apiUrl: "$(escape "$API_URL")",
  keycloakUrl: "$(escape "$KEYCLOAK_URL")",
  keycloakRealm: "$(escape "$KEYCLOAK_REALM")",
  keycloakClientId: "$(escape "$KEYCLOAK_CLIENT_ID")"
};
CONFIG

echo "Starting admin panel with apiUrl=${API_URL} keycloakUrl=${KEYCLOAK_URL} realm=${KEYCLOAK_REALM}"

exec "$@"
```

- [ ] **Step 4: Check the entrypoint's escaping by running the real script**

The entrypoint is shell, so it has no vitest suite. Run the actual file against a hostile
value, with the output path overridden, and read what it wrote:

```bash
cd /Users/alexmolnar/personal/sandbox/adminpaneler/admin
mkdir -p /tmp/admin-entrypoint
sed 's#^CONFIG_FILE=.*#CONFIG_FILE=/tmp/admin-entrypoint/config.js#' docker-entrypoint.sh > /tmp/admin-entrypoint/run.sh
API_URL='https://api.example"+alert(1)+"' sh /tmp/admin-entrypoint/run.sh true
cat /tmp/admin-entrypoint/config.js
node --check /tmp/admin-entrypoint/config.js && echo "config.js parses as JavaScript"
```

Expected: the quote in the value appears as `\"`, and `node --check` reports the file parses.
An unescaped quote makes the whole file a SyntaxError, which silently reverts the running app
to its localhost defaults. If it does not parse, stop and fix `escape` before continuing.

- [ ] **Step 5: Create the Helm chart by copying the web chart**

The two charts serve the same shape of workload, so copying is honest reuse rather than
duplication for its own sake. Every template is renamed from `drinksaver-web` to
`drinksaver-admin`:

```bash
cd /Users/alexmolnar/personal/sandbox/adminpaneler
mkdir -p admin/helm/drinksaver-admin
cp -R web/helm/drinksaver-web/templates admin/helm/drinksaver-admin/templates
grep -rl 'drinksaver-web' admin/helm/drinksaver-admin/templates \
  | xargs sed -i '' 's/drinksaver-web/drinksaver-admin/g'
grep -rn 'drinksaver-web' admin/helm/drinksaver-admin || echo "no stale references"
```

Expected: `no stale references`.

- [ ] **Step 6: Write `admin/helm/drinksaver-admin/Chart.yaml`**

```yaml
apiVersion: v2
name: drinksaver-admin
description: A Helm chart for the DrinkSaver admin panel - desktop-first reference data curation
type: application
version: 1.0.0
appVersion: "1.0.0"
maintainers:
  - name: DrinkSaver Team
keywords:
  - drinksaver
  - admin
  - react
```

Both versions are overwritten by `helm package --version --app-version` in CI. They exist so
`helm lint` has something to read.

- [ ] **Step 7: Write `admin/helm/drinksaver-admin/values.yaml`**

```yaml
# Default values for drinksaver-admin
replicaCount: 1

image:
  repository: ghcr.io/alex-molnar
  name: drinksaver-admin
  pullPolicy: IfNotPresent

# Runtime configuration. docker-entrypoint.sh writes these into /config.js when the
# container starts, so nothing is baked into the bundle and one image can be promoted
# between environments unchanged.
config:
  apiUrl: "https://api.drinksaver.kak.im"
  keycloakUrl: "https://auth.drinksaver.kak.im/auth"
  keycloakRealm: "drinksaver"
  # A Keycloak client ID, not a local name. It must match a client that exists in the
  # realm above, and it differs per environment, so both values files override it.
  # See deploy/values/admin-{test,prod}.yaml.
  keycloakClientId: "drinksaver-admin"

imagePullSecrets: []
nameOverride: ""
fullnameOverride: ""

serviceAccount:
  create: true
  annotations: {}
  name: ""

podAnnotations: {}
podSecurityContext: {}
securityContext: {}

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: "traefik"
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: admin.drinksaver.kak.im
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: drinksaver-admin-tls
      hosts:
        - admin.drinksaver.kak.im

# Smaller than the web app's. This serves a handful of people, not every user.
resources:
  limits:
    cpu: 100m
    memory: 96Mi
  requests:
    cpu: 25m
    memory: 48Mi

autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 2
  targetCPUUtilizationPercentage: 80

nodeSelector: {}
tolerations: []
affinity: {}

livenessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 5
  periodSeconds: 5
```

- [ ] **Step 8: Write the two values files**

`deploy/values/admin-test.yaml`:

```yaml
# drinksaver-admin, test environment (namespace drinksaver-test).
# Applied by .github/workflows/deploy-test-admin.yml.
# Editing this file triggers "Apply admin test values", which reapplies it to the chart
# version already released in drinksaver-test without rebuilding.

config:
  apiUrl: "https://test.api.drinksaver.kak.im"
  keycloakUrl: "https://auth.drinksaver.kak.im/auth"
  keycloakRealm: "test-drinksaver"
  # The client ID registered in Keycloak, not a local name. This client needs a Group
  # Membership mapper on the "groups" claim, or every signed-in user is refused by the
  # admin gate.
  keycloakClientId: "test-drinksaver-admin"

ingress:
  enabled: true
  className: "traefik"
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: test.admin.drinksaver.kak.im
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: drinksaver-admin-tls
      hosts:
        - test.admin.drinksaver.kak.im
```

`deploy/values/admin-prod.yaml`:

```yaml
# drinksaver-admin, production environment (namespace drinksaver).
# Applied by .github/workflows/deploy.yml.

config:
  apiUrl: "https://api.drinksaver.kak.im"
  keycloakUrl: "https://auth.drinksaver.kak.im/auth"
  keycloakRealm: "drinksaver"
  # The client ID registered in the production realm. Test uses test-drinksaver-admin.
  # Confirm this client exists, and carries the groups mapper, before cutover.
  keycloakClientId: "drinksaver-admin"

ingress:
  enabled: true
  className: "traefik"
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: admin.drinksaver.kak.im
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: drinksaver-admin-tls
      hosts:
        - admin.drinksaver.kak.im
```

- [ ] **Step 9: Render the chart against both values files**

```bash
cd /Users/alexmolnar/personal/sandbox/adminpaneler
helm lint admin/helm/drinksaver-admin
helm template drinksaver-admin admin/helm/drinksaver-admin \
  --values deploy/values/admin-test.yaml | grep -E 'host:|KEYCLOAK_CLIENT_ID|image:' -A1
helm template drinksaver-admin admin/helm/drinksaver-admin \
  --values deploy/values/admin-prod.yaml | grep -E 'host:|KEYCLOAK_CLIENT_ID' -A1
```

Expected: the test render shows `test.admin.drinksaver.kak.im` and `test-drinksaver-admin`;
the production render shows `admin.drinksaver.kak.im` and `drinksaver-admin`. If the
`KEYCLOAK_CLIENT_ID` env var is missing from the deployment, the copied template still refers
to a value key that does not exist; check `templates/deployment.yaml`.

- [ ] **Step 10: Build the image locally**

```bash
cd /Users/alexmolnar/personal/sandbox/adminpaneler
docker build -t drinksaver-admin:local admin
docker run --rm -e API_URL=https://test.api.drinksaver.kak.im drinksaver-admin:local \
  cat /usr/share/nginx/html/config.js 2>/dev/null || \
docker run --rm --entrypoint sh drinksaver-admin:local -c \
  'API_URL=https://test.api.drinksaver.kak.im /docker-entrypoint.sh true; cat /usr/share/nginx/html/config.js'
```

Expected: the printed `config.js` contains `apiUrl: "https://test.api.drinksaver.kak.im"` and
`window.__DRINKSAVER_ADMIN_CONFIG__`. If Docker is not running, skip this step and note it in
the commit message; CI builds the image on every push regardless.

- [ ] **Step 11: Commit**

```bash
git add admin/Dockerfile admin/nginx.conf admin/docker-entrypoint.sh admin/helm/ deploy/values/admin-test.yaml deploy/values/admin-prod.yaml
git commit -m "feat(admin): container image, nginx config and helm chart"
```

---

### Task 13: GitHub Actions workflows

**Files:**
- Create: `.github/workflows/deploy-test-admin.yml`, `.github/workflows/apply-values-admin.yml`
- Modify: `.github/workflows/build.yml`, `.github/workflows/deploy.yml`
- Test: `actionlint` if available, plus a read-through against the web equivalents.

**Interfaces:**
- Consumes: the image and chart names from Task 12.
- Produces: four pipelines matching the web app's, keyed on `admin/**`.

- [ ] **Step 1: Write `.github/workflows/deploy-test-admin.yml`**

This is `deploy-test-web.yml` with the paths, names and concurrency group changed. Copy it and
edit rather than retyping, so the security comments and the `persist-credentials: false`
settings carry over:

```bash
cd /Users/alexmolnar/personal/sandbox/adminpaneler
sed -e 's/drinksaver-web/drinksaver-admin/g' \
    -e "s#'web/\*\*'#'admin/**'#" \
    -e 's#web/package.json#admin/package.json#g' \
    -e 's#web/package-lock.json#admin/package-lock.json#g' \
    -e 's#working-directory: web#working-directory: admin#' \
    -e 's#context: web#context: admin#' \
    -e 's#web/helm/drinksaver-admin#admin/helm/drinksaver-admin#' \
    -e 's#deploy/values/web-test.yaml#deploy/values/admin-test.yaml#' \
    -e 's/Deploy web to test/Deploy admin to test/' \
    -e 's/deploy-test-web/deploy-test-admin/' \
    .github/workflows/deploy-test-web.yml > .github/workflows/deploy-test-admin.yml
grep -n 'web' .github/workflows/deploy-test-admin.yml || echo "no stale web references"
```

Expected: `no stale web references`. If any line still mentions `web`, fix it by hand, then
confirm the file contains all of:

- `paths: - 'admin/**'`
- `concurrency: group: deploy-test-admin`
- `working-directory: admin` on the test step
- `helm package admin/helm/drinksaver-admin`
- `--values deploy/values/admin-test.yaml`
- `helm upgrade --install drinksaver-admin`

- [ ] **Step 2: Write `.github/workflows/apply-values-admin.yml`**

```bash
cd /Users/alexmolnar/personal/sandbox/adminpaneler
sed -e 's/drinksaver-web/drinksaver-admin/g' \
    -e 's#deploy/values/web-test.yaml#deploy/values/admin-test.yaml#g' \
    -e 's/Apply web test values/Apply admin test values/' \
    -e 's/deploy-test-web/deploy-test-admin/' \
    -e 's/Deploy web to test/Deploy admin to test/' \
    .github/workflows/apply-values-web.yml > .github/workflows/apply-values-admin.yml
grep -n 'web' .github/workflows/apply-values-admin.yml || echo "no stale web references"
```

The shared concurrency group matters: this workflow and `deploy-test-admin.yml` mutate the same
Helm release, so they must never run at once.

- [ ] **Step 3: Add the `admin` job to `.github/workflows/build.yml`**

Insert after the `web` job, before `summary`. It mirrors the web job exactly:

```yaml
  admin:
    name: Admin image and chart
    needs: version
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          # Nothing in this job uses git after checkout, and it runs third-party npm
          # install scripts. Not leaving the token in .git/config keeps a compromised
          # dev dependency away from it.
          persist-credentials: false

      - name: Stamp version into package.json
        env:
          VERSION: ${{ needs.version.outputs.version }}
        run: |
          set -euo pipefail
          jq --arg v "$VERSION" '.version = $v' admin/package.json > admin/package.json.tmp
          mv admin/package.json.tmp admin/package.json

      - name: Set up Node
        uses: actions/setup-node@v7
        with:
          # jsdom 30 requires ^22.22.2 || ^24.15.0 || >=26, and vitest 5 requires ^22.12
          # or newer. Node 20 fails at import with
          # "webidl.util.markAsUncloneable is not a function".
          node-version: '24'
          cache: 'npm'
          cache-dependency-path: admin/package-lock.json

      # The image build compiles the app but never runs the suite, so without this a red
      # test would reach the environment unnoticed.
      - name: Run admin tests
        working-directory: admin
        run: |
          set -euo pipefail
          npm ci
          npm run lint
          npm run test:coverage

      - name: Set up Buildx
        uses: docker/setup-buildx-action@v4

      - uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push image
        uses: docker/build-push-action@v7
        with:
          context: admin
          push: true
          tags: ghcr.io/${{ needs.version.outputs.owner }}/drinksaver-admin:${{ needs.version.outputs.version }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Package and push Helm chart
        env:
          VERSION: ${{ needs.version.outputs.version }}
          OWNER: ${{ needs.version.outputs.owner }}
          GH_ACTOR: ${{ github.actor }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          set -euo pipefail
          helm registry login ghcr.io --username "$GH_ACTOR" --password "$GH_TOKEN"
          helm package admin/helm/drinksaver-admin \
            --version "$VERSION" --app-version "$VERSION" \
            --destination dist
          helm push "dist/drinksaver-admin-${VERSION}.tgz" "oci://ghcr.io/${OWNER}/charts"
```

Then extend the `summary` job: change `needs: [version, backend, web]` to
`needs: [version, backend, web, admin]`, and add two lines inside its heredoc:

```bash
            echo "ghcr.io/${OWNER}/drinksaver-admin:${VERSION}"
            echo "ghcr.io/${OWNER}/charts/drinksaver-admin:${VERSION}"
```

- [ ] **Step 4: Add the admin deployment to `.github/workflows/deploy.yml`**

The workflow is manual only, takes a per-chart boolean and an optional version, and has one job
per chart. Add a third input, after `deploy-web`:

```yaml
      deploy-admin:
        description: 'Deploy the drinksaver-admin chart'
        type: boolean
        default: true
```

Then add the job after the `web` job. It is the `web` job with the names changed: nothing is
built, the chart and image were published by `build.yml` and are pulled by version.

```yaml
  admin:
    name: Deploy admin
    needs: version
    if: ${{ inputs.deploy-admin }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - name: Configure kubectl
        env:
          KUBE_CONFIG: ${{ secrets.KUBE_CONFIG }}
        run: |
          set -euo pipefail
          # umask first: the redirect below creates the file before chmod runs.
          umask 077
          mkdir -p "$HOME/.kube"
          printf '%s' "$KUBE_CONFIG" | base64 -d > "$HOME/.kube/config"
          chmod 600 "$HOME/.kube/config"

      - name: Deploy chart from registry
        env:
          VERSION: ${{ needs.version.outputs.version }}
          OWNER: ${{ needs.version.outputs.owner }}
          GH_ACTOR: ${{ github.actor }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          set -euo pipefail
          helm registry login ghcr.io --username "$GH_ACTOR" --password "$GH_TOKEN"
          helm upgrade --install drinksaver-admin \
            "oci://ghcr.io/${OWNER}/charts/drinksaver-admin" \
            --version "${VERSION}" \
            --namespace drinksaver \
            --values deploy/values/admin-prod.yaml \
            --set image.tag="${VERSION}" \
            --wait --timeout 5m

      - name: Report
        run: kubectl get deploy,pod,ingress -n drinksaver -l app.kubernetes.io/name=drinksaver-admin
```

The workflow ends each job with its own `Report` step rather than a shared summary, so there is
nothing else to extend. Leave the `version` job untouched: the admin chart takes the same version
as the other two, because all three come from one `VERSION` file and are published together.

- [ ] **Step 5: Lint the workflows**

```bash
cd /Users/alexmolnar/personal/sandbox/adminpaneler
command -v actionlint >/dev/null && actionlint .github/workflows/*.yml || \
  python3 -c "
import sys, yaml, pathlib
for path in sorted(pathlib.Path('.github/workflows').glob('*.yml')):
    yaml.safe_load(path.read_text())
    print('ok', path)
"
```

Expected: every workflow parses. `actionlint` additionally checks expression syntax; if it is
not installed, the YAML parse is the floor.

- [ ] **Step 6: Confirm the trigger paths do not overlap**

```bash
grep -A4 'paths:' .github/workflows/deploy-test-*.yml
```

Expected: `deploy-test-web.yml` watches `web/**`, `deploy-test-backend.yml` watches
`backend/**`, `deploy-test-admin.yml` watches `admin/**`. A push touching only `admin/` must
not redeploy the web app, and a push touching only `web/` must not redeploy the admin panel.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/
git commit -m "ci(admin): build, publish and deploy pipelines for the admin panel"
```

---

### Task 14: Coverage ratchet, documentation and known debt

**Files:**
- Modify: `admin/vite.config.ts`, `docs/DEPLOYMENT.md`, `docs/api-docs.yaml`, `docs/remaining-work.md`, `CLAUDE.md`, `AGENTS.md`, `QWEN.md`
- Create: `admin/README.md`

**Interfaces:**
- Consumes: the finished suite from Tasks 1 through 11.
- Produces: real coverage floors, and documentation matching what the repository already keeps.

- [ ] **Step 1: Measure the finished suite**

```bash
cd admin && npm run test:coverage
```

Record the four percentages from the `text-summary` reporter. They are needed verbatim in the
next step.

- [ ] **Step 2: Set the floors in `admin/vite.config.ts`**

Replace the placeholder `thresholds` block with the measured values rounded down to the
nearest whole number, and the comment this repository uses everywhere else. For example, if the
run measured 96.42 / 89.77 / 94.12 / 96.88:

```ts
      // A ratchet, not a target. Set just below the measured value at the time the suite
      // was introduced so coverage cannot regress. Raise it as tests are added; do not
      // lower it.
      //
      // Set 2026-09-21 when the admin panel landed.
      // Measured 96.42 / 89.77 / 94.12 / 96.88.
      thresholds: {
        statements: 96,
        branches: 89,
        functions: 94,
        lines: 96,
      },
```

- [ ] **Step 3: Verify the gate actually gates**

```bash
cd admin && npm run test:coverage
```

Expected: PASS. Then confirm the floor is real by raising one threshold above its measured
value temporarily, re-running, seeing it FAIL, and putting it back. A threshold that cannot
fail is not a gate.

- [ ] **Step 4: Write `admin/README.md`**

````markdown
# DrinkSaver admin panel

Desktop-first curation tool for the reference data the DrinkSaver app reads: colour
palettes, glassware, default recommendations and the catalogue of user-created entries.

Access requires membership of the Keycloak `admin` group. An unauthenticated visitor is
redirected to Keycloak; a signed-in user outside the group sees a refusal page and nothing
else.

## Running locally

```sh
npm install
npm run dev
```

Configuration comes from `public/config.js` in development and from `/config.js`, written by
`docker-entrypoint.sh`, in a container. Nothing environment-specific is baked into the bundle.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm test` | Vitest, one pass |
| `npm run test:coverage` | Vitest with the coverage gate |
| `npm run lint` | eslint, blocking in CI |
| `npm run build` | Type check and production build |

## Structure

| Path | What it is |
| --- | --- |
| `src/auth/` | Keycloak init and the admin group gate |
| `src/api/` | axios client, endpoint functions, query keys, error classification |
| `src/sections/` | One folder per admin area, collected in `sections/registry.tsx` |
| `src/components/` | The shell, the responsive table, the confirm dialog |
| `src/theme/` | Design tokens and the MUI theme |
| `helm/drinksaver-admin/` | The Helm chart |

Adding an admin area means adding a folder under `src/sections/` and one entry to
`registry.tsx`. Navigation and routing both derive from that array.

## Design and plan

- Design: `../docs/superpowers/specs/2026-09-21-admin-panel-design.md`
- Implementation plan: `../docs/superpowers/plans/2026-09-21-admin-panel.md`
````

- [ ] **Step 5: Add the admin paths to `docs/api-docs.yaml`**

Add every path from spec section 5 under `paths:`, and the `AdminOwned` fields to the existing
catalogue schemas. Follow the file's existing style exactly: it is hand maintained, so match
the surrounding indentation and the way responses are described.

At minimum, each path needs its method, a summary, its parameters, a 200 or 204 response, and
a 403 response. The design DELETE paths also need a 409. Example, matching the file's shape:

```yaml
  /v1/admin/design/color-palette/{id}:
    patch:
      summary: Update a colour palette. Requires membership of the admin group.
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            format: int32
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ColorPalette'
      responses:
        '200':
          description: The updated palette
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ColorPalette'
        '403':
          description: The caller is not in the admin group
    delete:
      summary: Delete a colour palette. Requires membership of the admin group.
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            format: int32
      responses:
        '204':
          description: Deleted
        '403':
          description: The caller is not in the admin group
        '409':
          description: The palette is still referenced and was not deleted
```

Add a note at the top of the admin block stating that these endpoints are the contract the
admin panel is coded against, and that the backend implementing them is written separately.

- [ ] **Step 6: Add the admin section to `docs/DEPLOYMENT.md`**

Read the document's structure first and place these where its existing per-application material
lives, matching its headings and tone. The content:

````markdown
## The admin panel

A third deployable, built and released exactly like the other two. Image
`ghcr.io/alex-molnar/drinksaver-admin`, chart `drinksaver-admin`, both versioned from the root
`VERSION` file.

| Environment | Namespace | Host | Values |
| --- | --- | --- | --- |
| Test | `drinksaver-test` | `test.admin.drinksaver.kak.im` | `deploy/values/admin-test.yaml` |
| Production | `drinksaver` | `admin.drinksaver.kak.im` | `deploy/values/admin-prod.yaml` |

Workflows: `deploy-test-admin.yml` on any non-main push touching `admin/**`,
`apply-values-admin.yml` for a values-only edit, an `admin` job in `build.yml` on a push to
main, and a `deploy-admin` input on `deploy.yml` for the manual production release.

### Keycloak setup

The panel is gated on membership of a Keycloak group named `admin`, and neither the group nor
the client is created by a deploy. `docs/keycloak-admin-setup.md` is the step-by-step guide:
the group, the client per realm, and the Group Membership mapper that puts the claim in the
access token. Follow it before the first deploy of each environment, or the panel refuses
every signed-in user and the symptom reads as a broken login.

### Runtime configuration

Same mechanism as the web app: one image per version, `docker-entrypoint.sh` writes `/config.js`
before nginx starts. The global is `window.__DRINKSAVER_ADMIN_CONFIG__`, deliberately distinct
from the consumer app's `window.__DRINKSAVER_CONFIG__`, so neither can supply the other's
Keycloak client id.

### Exposure

The panel is on the public internet behind Keycloak and nothing else: no IP allowlist, no VPN,
no ingress-level auth. That is an accepted risk, recorded alongside the others in
`docs/remaining-work.md`. The controls that do apply are the group gate, the backend rejecting
`/v1/admin/**` for non-members, and the frame-ancestors and X-Frame-Options headers in
`admin/nginx.conf`.
````

- [ ] **Step 7: Record the deferred work in `docs/remaining-work.md`**

Three entries, in the file's existing format. Check the current highest id in each group first
and use the next free one; the ids below assume `HK-3` and `OPS-3` are the last in the file
today.

````markdown
## HK-4. No end-to-end suite for the admin panel

**Effort:** medium.
**Blocked by:** nothing.

### Why

The admin panel shipped with unit tests and no browser journey. Its riskiest path, the Keycloak
group gate, is the one thing a unit test can only assert against a mocked token: whether the
real realm actually issues a `groups` claim is not something jsdom can answer.

This was deferred deliberately rather than forgotten. The local stack has no admin user and no
admin group, so the suite needs realm changes before it needs test code, and a journey written
against a UI that has not settled is a journey rewritten twice.

### Where

`deploy/local/keycloak-realm.json`, `web/e2e/` (or a new `admin/e2e/`), `.github/workflows/e2e.yml`.

### Do

1. Add an `admin` group and an admin user to `deploy/local/keycloak-realm.json`, plus the group
   membership mapper on the client, so the local token carries the claim the app reads.
2. Add a Playwright project for the admin panel, following `web/e2e/playwright.config.ts`.
3. Write two journeys: a non-admin user is refused, and an admin edits a palette and sees it
   persist. The refusal is the more valuable of the two.
4. Gate it on main only, the way the web e2e suite is gated.

### Done when

`npm run e2e` drives a real browser through a real Keycloak login for both an admin and a
non-admin, and CI runs it on main.

## HK-5. `web/src` and `admin/src` carry duplicate infrastructure

**Effort:** medium.
**Blocked by:** nothing. Do not do this speculatively.

### Why

`config.ts`, `api/client.ts`, the four files under `auth/`, and `theme/{primitives,tokens,cssVars}.ts`
exist twice, once per application, about 400 lines. This was chosen knowingly when the admin
panel landed: an npm workspace would have changed the web app's build context, Dockerfile, CI
cache keys and coverage configuration, all of which currently assume `web/` is self-contained,
and that is a real cost paid up front against a drift risk that is small and slow.

The theme copies are the ones that matter. If they diverge, the admin panel's palette previews
stop showing what a user actually sees, which is the entire point of that screen, and nothing
fails to tell you.

### Where

`web/src/{config.ts,api/client.ts,auth/,theme/}` and their twins under `admin/src/`.

### Do

1. First, cheaply: add a CI step that runs `diff` on the three theme files and fails if they
   differ. That catches the failure that actually costs something, for about five lines.
2. Only if the duplication causes a real bug, extract a `shared/` workspace package, and budget
   for touching both Dockerfiles, both CI caches and both coverage configs.

### Done when

Either the diff check is in CI, or the shared package exists and both applications build from it.

## OPS-4. DNS and certificates for the two admin hosts

**Effort:** small.
**Blocked by:** nothing.

### Why

`test.admin.drinksaver.kak.im` and `admin.drinksaver.kak.im` are referenced by
`deploy/values/admin-{test,prod}.yaml`. A deploy against a host with no DNS record produces an
ingress that resolves nowhere and a cert-manager order that never completes, and the Helm
release still reports success.

### Where

The DNS zone for `drinksaver.kak.im`, and the `drinksaver-admin-tls` secret in each namespace.

### Do

1. Create both records, pointing at the same ingress as the existing hosts.
2. Run the test deploy and confirm cert-manager issues `drinksaver-admin-tls` in
   `drinksaver-test`.
3. Repeat for production at cutover.

### Done when

Both hosts serve the panel over HTTPS with a valid certificate.
````

- [ ] **Step 8: Add the admin row to the repository instruction files**

`CLAUDE.md`, `AGENTS.md` and `QWEN.md` share the same content. Add to the "What this repo is"
table in each:

```markdown
| `admin/` | React 19, TypeScript, Vite, MUI 9, TanStack Query, `keycloak-js`. Desktop-first admin panel, gated on the Keycloak `admin` group. |
| `admin/helm/drinksaver-admin/` | The admin panel Helm chart. |
| `docs/keycloak-admin-setup.md` | The Keycloak group, client and mapper the admin panel needs. Not created by any deploy. |
```

And to the testing table:

```markdown
| Admin | Vitest 5, jsdom, React Testing Library | `cd admin && npm run test` |
```

Keep the three files identical. Diff them afterwards:

```bash
cd /Users/alexmolnar/personal/sandbox/adminpaneler
diff CLAUDE.md AGENTS.md && diff CLAUDE.md QWEN.md && echo "instruction files match"
```

- [ ] **Step 9: Run everything one final time**

```bash
cd /Users/alexmolnar/personal/sandbox/adminpaneler/admin
npm run lint && npm run test:coverage && npm run build
cd .. && helm lint admin/helm/drinksaver-admin
```

Expected: lint clean, suite green, coverage gate satisfied, build succeeds, chart lints.

- [ ] **Step 10: Commit**

```bash
git add admin/vite.config.ts admin/README.md docs/ CLAUDE.md AGENTS.md QWEN.md
git commit -m "docs(admin): coverage ratchet, deployment notes, API contract and known debt"
```

---

## Verification against the design

After Task 14, check each spec section against what was built:

| Spec section | Verified by |
| --- | --- |
| 1, separate application | `admin/` builds, images and charts publish independently (Tasks 1, 12, 13) |
| 3, theme copied not re-declared | `diff` against `web/src/theme/` plus the token-name test in `muiTheme.test.ts` (Task 5) |
| 2, auth and group gate | `adminGroup.test.ts`, `KeycloakProvider.test.tsx`, `AdminGate.test.tsx` (Task 3) |
| 3, registry and layout | `registry.test.ts`, `AdminShell.test.tsx` (Task 6) |
| 4.1, palettes | `PaletteEditor.test.tsx`, `PalettesSection.test.tsx` (Task 8) |
| 4.2, glassware | `svgPath.test.ts`, `GlasswareEditor.test.tsx`, `GlasswareSection.test.tsx` (Task 9) |
| 4.3, default recommendations | `reorder.test.ts`, `RecommendationsSection.test.tsx`, `NewRecommendationDialog.test.tsx` (Task 10) |
| 4.4, catalogue review | `catalogueTabs.test.ts`, `CatalogueSection.test.tsx` (Task 11) |
| 5, backend contract | `admin.test.ts` asserts every path and verb (Task 4); `docs/api-docs.yaml` records it (Task 14) |
| 6, data layer | `queries.ts` centralises keys; optimistic paths tested in Tasks 10 and 11 |
| 7, runtime configuration | `config.test.ts` (Task 2), entrypoint check (Task 12) |
| 8, deployment and exposure | `helm template` against both values files and the response headers in `nginx.conf` (Task 12), workflow paths (Task 13) |
| 9, testing | Coverage ratchet set from a real measurement (Task 14) |
| 10, documentation | DEPLOYMENT.md, api-docs.yaml, README.md (Task 14) |

Anything on this list without a green check is unfinished work, not a judgement call. Go back
to the task that owns it.

## What this plan does not do

- No Playwright suite. Deferred deliberately, recorded in `docs/remaining-work.md` (Task 14).
- No backend. Every endpoint in spec section 5 is written separately; this plan's tests mock
  `api/admin.ts` and assert the contract rather than exercising it.
- No shared package between `web/` and `admin/`. The duplication is accepted and recorded.
- No light and dark toggle in the admin shell. The palette editor previews both regardless,
  which is the only place both are needed.

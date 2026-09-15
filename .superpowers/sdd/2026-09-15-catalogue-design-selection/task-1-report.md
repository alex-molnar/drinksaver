# Task 1 implementation report

## Outcome

The web creation boundary now accepts the OpenAPI-supported design metadata:

- Alcohol types and subtypes: optional integer `colorPaletteId` and `glasswareId`.
- Beer brands and flavours: optional integer `colorPaletteId`.
- `CreateCatalogueEntryInput` carries the relevant optional values to the endpoint functions.
- `DesignCatalogue` exposes the fetched `palettes` and `glassware` arrays alongside its ID/name resolvers.

The HTTP boundary removes `undefined` overrides before posting JSON. Omitting an override is the sole inheritance signal.

## Red / green evidence

### Red

Before production changes, I expanded the endpoint, catalogue mutation, and design catalogue tests. The focused run was red:

```text
npm test -- src/api/endpoints.test.ts src/drink/useCreateCatalogueEntry.test.tsx src/drink/design.test.tsx
Test Files 3 failed
Tests 9 failed | 25 passed (34)
```

The failures showed the old subtype/flavour signatures nesting the new payload as `name`, mutations dropping the metadata, and missing `DesignCatalogue.palettes` / `.glassware`. The explicit undefined-override endpoint test also failed because the old implementation placed the supplied object under `name`.

### Green

After the minimal typed-boundary implementation:

```text
npm test -- src/api/endpoints.test.ts src/drink/useCreateCatalogueEntry.test.tsx src/drink/design.test.tsx
Test Files 3 passed (3)
Tests 34 passed (34)
```

Fresh wider verification then passed:

```text
npm test       # 49 files, 533 tests passed
npm run lint   # exit 0
npm run build  # tsc -b and vite build exit 0
git diff --check # no output, exit 0
```

## Files changed

- `web/src/types/api.ts` — added optional integer request fields to the four OpenAPI request interfaces.
- `web/src/api/endpoints.ts` — threaded request objects through subtype/flavour endpoints and removes only undefined design overrides before POSTing.
- `web/src/drink/useCreateCatalogueEntry.ts` — carries selected metadata through each supported catalogue mutation without emitting undefined values.
- `web/src/drink/designCatalogue.ts` — exposes readonly fetched palette and glassware arrays.
- `web/src/api/endpoints.test.ts` — verifies all four POST shapes and JSON omission for undefined inherited values.
- `web/src/drink/useCreateCatalogueEntry.test.tsx` — verifies mutation forwarding for type, subtype, brand, flavour, and omission of absent child overrides.
- `web/src/drink/design.test.tsx` — verifies catalogue list exposure.

## Self-review and security review

Reviewed the complete scoped diff, `git blame` context for the modified endpoint boundary, and all direct production callers. There is one production caller for each changed subtype/flavour endpoint signature, both updated. No routes, credentials, authorization behavior, or untrusted execution paths were added. The existing authenticated HTTP client and backend validation remain the security boundary.

The omission helper is intentionally narrow: it removes only `undefined`; creation types reject `null`, so absence is the only inheritance signal. Tests cover numeric metadata forwarding and the absence of undefined overrides. `DesignCatalogue` keeps the original readonly fetched arrays, so future selectors receive live successful query data without losing resolver fallback behavior.

## Concerns

No unresolved implementation concerns. End-to-end browser coverage was not added because this task exposes the typed/mutation boundary only; selector UI behavior is explicitly deferred to the next task. The full web test suite, lint, TypeScript build, and production bundle build are green.

## Fix round 1: integer-only inheritance metadata

Review clarification: OpenAPI creation schemas are integer-only, and inherited design values must be omitted rather than represented as `null`. No OpenAPI or backend code changed.

### Red

I added compile-checked type assertions for all four `New*` request types and `CreateCatalogueEntryInput`, each marking `null` as an expected type error. Before narrowing the types, the focused Vitest run executed the new test, while the TypeScript build failed because all five `@ts-expect-error` directives were unused:

```text
npm test -- src/api/endpoints.test.ts src/drink/useCreateCatalogueEntry.test.tsx
Test Files 2 passed (2)
Tests 32 passed (32)

npm run build
src/api/endpoints.test.ts(...): error TS2578: Unused '@ts-expect-error' directive. (5 occurrences)
```

That failure demonstrates that `null` was still accepted by the prior request/input types.

### Green

I narrowed only creation metadata to `number` (responses remain nullable where their response schemas permit it), and updated the input documentation to state that omission inherits. The existing endpoint omission test continues to verify that no-override subtype payloads contain neither design property.

```text
npm test -- src/api/endpoints.test.ts src/drink/useCreateCatalogueEntry.test.tsx src/drink/design.test.tsx
Test Files 3 passed (3)
Tests 35 passed (35)

npm run build
tsc -b && vite build: exit 0
```

### Scope ruling

No client-side ID-0 or catalogue-membership guard was added. The only live selector caller is intentionally handled by the later selector task; a low-level numeric guard cannot establish membership, and server integrity is outside this frontend boundary task.

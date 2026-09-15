# Task 4 evidence report: catalogue design selection

## Scope

Changed only:

- `web/e2e/tests/add-sheet-identity.spec.ts`
- `web/README.md`
- this evidence report

No backend, production frontend, API contract, or unrelated test changes were made.

## Test-first evidence

The new Playwright scenario was introduced before changing its fixture. It required the New drink
type panel to expose the fetched `beerjug` glassware option. With the existing empty glassware
fixture, the focused run failed as intended:

```text
expect(locator).toBeVisible() failed
Locator: getByLabel('Glassware').getByRole('option', { name: 'beerjug', exact: true })
Error: element(s) not found
```

Command:

```bash
cd web && npm run e2e -- add-sheet-identity.spec.ts
```

The test fixture then gained realistic palette and glassware API values. The final assertion uses
`toHaveCount(1)`, since browser-native `option` elements are present but Playwright correctly
does not classify them as visible. No product code was changed to make the test pass.

## Browser coverage

The new journey runs at the existing narrow portrait `375 × 812` and phone landscape `812 × 375`
sizes. It waits for `networkidle` before inspecting the rendered page and does not use arbitrary
waits. It uses role and label locators throughout, and it focuses the recommendation checkbox and
uses Space to toggle it.

Each write is route-fulfilled and asserted, so the test does not create data in the local stack:

| Endpoint | Expected request assertion |
| --- | --- |
| `POST /v1/alcohol/types` | `Cider` carries selected palette `8` and glassware `12` |
| `POST /v1/alcohol/types/100/volumes` | `Small` carries only its name and `0.33` volume |
| `POST /v1/alcohol/types/100/subtypes` | `Dry` carries selected palette `1` and glassware `2` |
| `POST /v1/beer/brands` | `Hops House` omits its inherited palette override |
| `POST /v1/beer/brands/103/flavours` | `Crisp` omits its inherited palette override |
| `POST /v1/drinks/new` | A keyboard-enabled recommendation save sends explicit palette `5` and glassware `6`, alongside its beer IDs and `addToRecommendations: true` |

The fixture returns the created entry from each POST, including the subtype endpoint, so the real
create-and-adopt client path is exercised.

## Documentation

`web/README.md` now documents `DesignSelector` as a controlled override component. The entry
states its props and `null` inherited state, that only fetched IDs are selectable, independent
palette and glassware behavior, inherited request omission, palette-only beer brand/flavour
entries, and recommendation override resolution before saving.

## Verification

```text
cd web && npm run lint
exit 0

cd web && npm run e2e -- add-sheet-identity.spec.ts
5 passed (19.5s)

cd web && npm test
50 files and 550 tests passed (11.21s)
```

The local `localhost:3000` compose web container was initially stale and did not contain the
current design controls. It was rebuilt with `docker-compose -f compose.yaml up -d --build` before
the final run. The browser test POSTs remained intercepted after that rebuild.

## Review and limitations

Diff review found and corrected one test-fixture issue: the subtype POST mock returned a list
instead of the API's created subtype object. The final diff has no production code, authorization,
secret, untrusted-input, or dependency-execution changes. `git diff --check` and ESLint are clean.

The focused Chromium suite validates the two configured mobile viewport sizes. No separate
screen-reader session or full Playwright suite was run; those are outside this task's focused
verification scope.

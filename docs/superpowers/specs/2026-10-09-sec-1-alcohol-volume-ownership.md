# Alcohol volume ownership

**Date:** 2026-10-09  
**Decision maker:** Alex Molnar (repository owner; implementation requested in the SEC-1 task)

## Decision

Alcohol volumes belong to the alcohol type that references them. The type owner may add a
volume; reads remain available to authenticated users because alcohol types and their volume
lists are shared catalogue data.

## Rationale

This preserves the distinction already represented by `AlcoholType.userId`: users can manage
their own types while published admin-owned types remain shared and read-only. Treating every
volume write as global would let any account alter admin catalogue data. A foreign or missing
type therefore produces the same 404 response, avoiding an existence oracle.

## Consequences

- The authenticated JWT subject is passed to the volume write and checked against the type owner.
- Volume payloads are limited to the existing UI range (0.01 through 1.99) and a 255-character
  name limit.
- Adding volume ownership to admin catalogue types requires an admin-owned account.

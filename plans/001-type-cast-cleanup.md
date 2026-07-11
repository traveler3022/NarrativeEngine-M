# Plan 001: Reduce type escape hatches (494 `as` casts)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise.
>
> **Drift check**: `git diff --stat 4a3ed1f..HEAD -- src/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding.

## Status
- **Priority**: P3
- **Effort**: L
- **Risk**: MED
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `4a3ed1f`, 2026-07-11

## Why this matters

The codebase has 494 `as` type casts outside test files. Each is a place
where the TypeScript compiler was overruled. The highest-risk casts are in
services/turn/pendingCommit.ts and services/npc/npcGeneration.ts where raw
LLM JSON output is cast to typed objects without runtime validation.

## Current state

- `src/services/turn/pendingCommit.ts` — parses LLM JSON, casts to `Record<string, unknown>`
- `src/services/npc/npcGenerator.ts` — casts parsed JSON fields to NPCEntry
- `src/store/slices/chatSlice.ts` — casts to `Partial<ChatDeps>`
- Pattern: `(finalParsed.drives as Record<string, string>).coreWant`

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npx tsc -b --noEmit`   | exit 0, no errors   |
| Tests     | `npx vitest run`        | all pass            |
| Lint      | `npx eslint .`          | exit 0              |

## Steps

1. **Audit `as` casts by severity** — separate safe casts (`as const`,
   type narrowing) from dangerous ones (raw JSON → typed object).
   
2. **Add runtime validation for LLM JSON parsing** — create a `validate`
   utility in `utils/jsonValidation.ts` that validates parsed JSON against
   expected shape before casting.

3. **Replace dangerous casts in pendingCommit.ts** — use the new validator
   for all LLM JSON parsing paths.

4. **Replace dangerous casts in npcGenerator.ts** — same treatment.

5. **Replace `as Partial<ChatDeps>` in chatSlice.ts** — use proper type
   narrowing instead of blanket casts.

6. **Run verification** — tsc + tests + lint must all pass.

## STOP conditions

- If removing a cast reveals a real type mismatch (the cast was hiding a bug),
  STOP and report — the fix is not just removing the cast.
- If a cast is in a hot path and the validator adds measurable latency,
  STOP and report — may need a different approach.

## Done criteria

- `grep -rn " as " src/ --include="*.ts" | grep -v __tests__ | grep -v "as const" | wc -l` ≤ 200 (was 494)
- `npx tsc -b --noEmit` passes
- `npx vitest run` passes
- No new test failures

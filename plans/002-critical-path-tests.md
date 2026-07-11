# Plan 002: Add tests for lifecycle/persistence/ports/adapters (0% coverage)

> **Executor instructions**: Follow this plan step by step.

## Status
- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `4a3ed1f`, 2026-07-11

## Why this matters

7 critical modules created during the architecture refactor have ZERO test
coverage. These modules own campaign switching, settings persistence, NPC
embedding lifecycle, chat image cleanup, and the port/adapter layer that
all services depend on. A regression in any of these would break the app
with no test to catch it.

## Current state

Files with 0 tests:
- `src/services/campaignLifecycle.ts` (155 lines) — campaign switching orchestration
- `src/services/settingsLifecycle.ts` (81 lines) — settings load/save
- `src/services/npcLifecycle.ts` (36 lines) — NPC embedding/cleanup
- `src/services/chatLifecycle.ts` (38 lines) — image cleanup + token counting
- `src/services/persistence/campaignStore.ts` (303 lines) — campaign CRUD
- `src/services/persistence/campaignStateSave.ts` (33 lines) — debounced save
- `src/services/persistence/settingsStore.ts` (35 lines) — settings persistence
- `src/ports/` (7 files) — port interfaces
- `src/adapters/` (7 files) — adapter implementations
- `src/__smoke__/w0-infrastructure.smoke.test.ts` — exists but only tests wiring

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Typecheck | `npx tsc -b --noEmit`           | exit 0              |
| Tests     | `npx vitest run`                | all pass            |

## Steps

1. **Create `src/services/__tests__/campaignLifecycle.test.ts`**
   - Mock: ports (campaignContextPort, settingsPort, notificationPort)
   - Mock: persistence (campaignStore functions)
   - Mock: embedding (warmupEmbedder, runFullReindex)
   - Test: switchCampaign with valid id — verifies hydration
   - Test: switchCampaign with null — verifies clearActiveCampaign
   - Test: switchCampaign aborts pending embedding
   - Test: switchCampaign commits pending turn
   - Test: preOpBackup calls api.backup.create

2. **Create `src/services/__tests__/settingsLifecycle.test.ts`**
   - Test: debouncedSaveSettings writes encrypted settings to idb
   - Test: loadSettingsFromPersistence decrypts and migrates
   - Test: applySettingsVisuals calls applyTheme/applyUIScale

3. **Create `src/services/__tests__/npcLifecycle.test.ts`**
   - Test: reembedNPC calls embedText + embeddingStorage.store
   - Test: deleteNPCAssets calls embeddingStorage.deleteByTypeAndId + imageStorage.deletePortrait
   - Test: nameMatchesLedger returns true for existing name

4. **Create `src/services/__tests__/chatLifecycle.test.ts`**
   - Test: deleteMessageImage calls imageStorage.delete
   - Test: deleteAllCampaignImages calls imageStorage.deleteAll
   - Test: countTextTokens calls countTokens

5. **Create `src/adapters/__tests__/messagingAdapter.test.ts`**
   - Test: each MessagingPort method delegates to correct useAppStore method
   - Test: getMessages returns store.messages
   - Test: replaceMessages calls useAppStore.setState

6. **Run verification** — all new tests pass + existing tests still pass

## STOP conditions

- If a module cannot be tested without mocking the entire store, STOP and
  report — the module may need to be refactored for testability first.

## Done criteria

- All 7 new test files exist and pass
- `npx vitest run` passes with 0 failures
- Test count increases by at least 30 new tests

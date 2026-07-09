# Wave 2.5 — Architecture Audit

Date: 2026-07-09
Branch: refactor/layer-separation
Commit: e502da7

## Architecture Metrics Snapshot

| Metric                        | Count |
|-------------------------------|-------|
| services → components         | 1     |
| store → components            | 0     |
| services → store (non-test)   | 3     |
| services → store (with test)  | 6     |
| runtime cycles                | 0     |

## Progression

| Wave | svc→store (non-test) | What changed                              |
|------|----------------------|-------------------------------------------|
| Start| 9                    | Baseline                                  |
| 2.1  | 8                    | engineRolls → engine/constants            |
| 2.2  | 5                    | 3 type-only imports → types/store         |
| 2.3  | 4                    | loreKeywordEnricher → LoreRepositoryPort  |
| 2.4  | 3                    | turnPostProcess → ChapterRepositoryPort   |
| 2.5  | 3                    | Audit — no code change                    |

## Remaining 3 Non-Test Leaks

All three call `useAppStore.getState()` — they need **in-memory state**,
not persistence. This means Repository is NOT enough. They need Ports.

### 1. `src/services/image/index.ts`

- **Reads:** `state.settings.presets`, `state.settings.activePresetId`
- **Writes:** `setMessageImage(messageId, image)`
- **Needs:** SettingsPort (read) + MessagingPort (write)
- **Store operations:** 3 (1 read + 2 write via setMessageImage)

### 2. `src/services/image/portrait.ts`

- **Reads:** `state.getActiveImageEndpoint()`, `state.npcLedger`
- **Writes:** `updateNPC(npcId, { portrait: true })`
- **Needs:** SettingsPort (read) + NPCCapability (write)
- **Store operations:** 3 (2 read + 1 write)

### 3. `src/services/turn/pendingCommit.ts` — God Orchestrator

- **Reads:** `messages`, `context`, `condenser`, `pinnedExcerpts`,
  `pinnedChapterIds`, `autoBookkeepingInterval`
- **Writes:** 22 operations across messaging, NPC, archive, context,
  UI state, divergence, pressure
- **Needs:** All 6 Ports (Messaging, NPC, Archive, CampaignContext,
  Settings, + UI event bus)
- **Store operations:** 28

## Decision: Port vs Repository

### What Repository solved (Waves 2.3-2.4)

| Service              | Was                  | Now                      |
|----------------------|----------------------|--------------------------|
| loreKeywordEnricher  | saveLoreChunks       | LoreRepositoryPort       |
| turnPostProcess      | loadChapters         | ChapterRepositoryPort    |

These were **persistence-only** calls — pure I/O. Repository was the
right pattern.

### What Repository CANNOT solve (remaining 3)

The remaining leaks are all `useAppStore.getState()` — they read/write
**in-memory state**, not persistence. A Repository (which wraps I/O)
cannot replace them. They need **Ports** (which wrap state access).

### Verdict

**Ports are required.** The 6 Ports from Phase 2.7 Interface Design
are the correct solution:

1. **MessagingPort** — for image/index.ts (setMessageImage)
2. **NPCCapability** — for image/portrait.ts (updateNPC)
3. **SettingsPort** — for both image services (read settings/presets)
4. **ArchivePort** — for pendingCommit (setChapters, setArchiveIndex, etc.)
5. **CampaignContextPort** — for pendingCommit (updateContext, bookkeeping)
6. **DivergencePort** — for pendingCommit (setDivergenceRegister)

`pendingCommit.ts` needs all 6 because it's the turn-commit orchestrator.
This is the "God Orchestrator" identified in the earlier architecture
audit — it will need to be split in Phase 4 (Structural Refactoring)
after the Ports are in place.

## Recommendation for Phase 3

1. Start with **SettingsPort** (read-only, 4 queries) — simplest,
   benefits both image services immediately.
2. Then **MessagingPort** + **NPCCapability** — unblocks image/index
   and image/portrait (2 of 3 leaks).
3. Then **ArchivePort** + **CampaignContextPort** + **DivergencePort**
   — unblocks pendingCommit (the last leak).
4. pendingCommit migration is the hardest — 28 store operations across
   6 Ports. Consider splitting it in Phase 4 before migrating.

## What This Wave Did NOT Change

- No code changes (audit only).
- No new files.
- No migration.
- The 3 remaining leaks are **documented and understood** — they are
  the input to Phase 3.

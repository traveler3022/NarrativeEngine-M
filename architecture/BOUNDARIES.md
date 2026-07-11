# Architecture Boundaries

This file is the canonical reference for the layer boundaries of
NarrativeEngine-M. Every refactor is measured against this table —
if a change crosses one of these boundaries, the change is wrong,
not the boundary.

## Status: ✅ All phases complete

- Phase 1: Stabilization ✅
- Phase 2: Discovery + Implementation ✅
- Phase 3: Port Implementation ✅ (0 leaks)
- Phase 4: Structural Refactoring ✅ (types split)
- Phase 5: Hardening ✅ (this update)

## Final Architecture Metrics

| Metric                        | Start | Final |
|-------------------------------|-------|-------|
| services → components         | 7     | 0     |
| store → components            | 3     | 0     |
| services → store (non-test)   | 7     | 0     |
| runtime cycles                | 1     | 0     |
| type casts (non-test)         | 3     | 0     |
| types/index.ts lines          | 975   | 639   |

## Layer rule

```
components (UI)
    │
    ▼  (uses)
store (Zustand, in-memory state)
    │
    ▼  (delegates to)
services (domain logic)
    │
    ▼  (depends on, never imports store/components directly)
ports (contracts)
    │
    ▲  (implemented by)
adapters (the only place that knows both sides)
    │
    ▲  (wired in)
main.tsx
```

The arrow direction matters:
- `services` → `ports` ✓
- `services` → `store` ✗ (use the port instead)
- `services` → `components` ✗ (use a port or event)
- `store` → `components` ✗ (use a port or callback)
- `adapters` → both `ports` and `store/components` ✓ (the seam)

## Boundaries (10 Ports + 10 Adapters)

| #  | Domain            | Port                    | Repository              | Adapter                                |
|----|-------------------|-------------------------|-------------------------|----------------------------------------|
| 1  | Notification      | NotificationPort        | —                       | adapters/uiToastAdapter.ts             |
| 2  | Messaging         | MessagingPort           | —                       | adapters/messagingAdapter.ts           |
| 3  | NPC               | NPCCapability           | —                       | adapters/npcAdapter.ts                 |
| 4  | Archive           | ArchivePort             | —                       | adapters/archiveAdapter.ts             |
| 5  | Campaign Context  | CampaignContextPort     | —                       | adapters/campaignContextAdapter.ts     |
| 6  | Settings          | SettingsPort            | —                       | adapters/settingsAdapter.ts            |
| 7  | UI State          | UIStatePort             | —                       | adapters/uiStateAdapter.ts             |
| 8  | Lore Persistence  | —                       | LoreRepositoryPort      | adapters/loreRepositoryAdapter.ts      |
| 9  | Chapter Persistence| —                      | ChapterRepositoryPort   | adapters/chapterRepositoryAdapter.ts   |
| 10 | Campaigns CRUD    | —                       | CampaignRepositoryPort  | adapters/campaignRepositoryAdapter.ts  |

## Types modules

| File          | Lines | Contents                                    |
|---------------|-------|---------------------------------------------|
| index.ts      | 639   | Re-export hub + remaining types             |
| loot.ts       | 106   | Loot Engine types (WO-01 contract)          |
| npc.ts        | 129   | NPC + Goal + Pressure + PersonalityHex      |
| archive.ts    | 113   | Archive + Divergence + SemanticFact         |
| store.ts      | 43    | ArmedLoot + ReindexState + CampaignState    |
| llmMessages.ts| 109   | LLM message types (pre-existing)            |

## What each column means

- **Port** — a contract interface in `src/ports/`. Services depend on
  it. Pure TypeScript, no React, no Zustand, no side effects.
- **Repository** — a contract interface in `src/ports/` for pure I/O
  (persistence only). Same rules as Port, but the contract is
  explicitly CRUD-ish: list/get/save/delete against some backing store.
- **Adapter** — the implementation in `src/adapters/`. The ONLY layer
  allowed to import both the port AND the store/components. Wired from
  `main.tsx` at boot.

## Remaining debt (Phase 5+)

- `npcGeneration.ts` (1306 lines) — God File, not split (high risk)
- `turnPostProcess.ts` (1237 lines) — God File, not split (high risk)
- `MemoryTab.tsx` (916 lines) — God Component, not split
- 4 test-only layer leaks (tracked, not critical)
- UIStatePort is pragmatic — should be removed when pendingCommit is split
- No automated test coverage (smoke tests needed)

## Non-goals (explicitly out of scope)

- UI transient state (drawer open, settings panel tab) lives in the UI
  layer directly. It does not get a port.
- Component-local state (form inputs, hover, focus) is not a port
  candidate and never will be.
- Test-only imports across layers are tolerated but tracked by
  `scripts/gate.mjs`.

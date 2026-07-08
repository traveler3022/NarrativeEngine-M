# Architecture Boundaries

This file is the canonical reference for the layer boundaries of
NarrativeEngine-M. Every refactor from Phase 3 onward is measured
against this table — if a change crosses one of these boundaries,
the change is wrong, not the boundary.

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

## Boundaries

| Domain            | Port                    | Repository              | Adapter                                |
|-------------------|-------------------------|-------------------------|----------------------------------------|
| Messaging         | MessagingPort           | —                       | adapters/messagingAdapter.ts           |
| NPC               | NPCCapability           | —                       | adapters/npcAdapter.ts                 |
| Archive           | ArchivePort             | —                       | adapters/archiveAdapter.ts             |
| Campaign Context  | CampaignContextPort     | —                       | adapters/campaignContextAdapter.ts     |
| Lore State        | LoreState               | —                       | adapters/loreStateAdapter.ts           |
| Lore Persistence  | —                       | LoreRepository          | adapters/loreRepositoryAdapter.ts      |
| Settings          | SettingsPort            | —                       | adapters/settingsAdapter.ts            |
| Campaigns CRUD    | —                       | CampaignRepository      | adapters/campaignRepositoryAdapter.ts  |

## What each column means

- **Port** — a contract interface in `src/ports/`. Services depend on
  it. Pure TypeScript, no React, no Zustand, no side effects.
- **Repository** — a contract interface in `src/ports/` for pure I/O
  (persistence only). Same rules as Port, but the contract is
  explicitly CRUD-ish: list/get/save/delete against some backing store.
- **Adapter** — the implementation in `src/adapters/`. The ONLY layer
  allowed to import both the port AND the store/components. Wired from
  `main.tsx` at boot.

## Stability flags

- ArchivePort currently has 11 commands — watch it in Phase 4. If
  split becomes necessary, split along the chapter / divergence /
  timeline / entity axes, not by accident.

## Non-goals (explicitly out of scope)

- UI transient state (drawer open, settings panel tab, pipeline
  phase, streaming stats, payload trace) lives in the UI layer
  directly. It does not get a port. Services that need to surface
  such state emit events; UI subscribes.
- Component-local state (form inputs, hover, focus) is not a port
  candidate and never will be.
- Test-only or type-only imports across layers are tolerated but
  tracked by `scripts/gate.mjs` so they don't quietly multiply.

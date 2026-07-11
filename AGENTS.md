# AGENTS.md — Narrative Engine

## Build / Test / Lint

| Purpose | Command |
|---------|---------|
| Typecheck | `npx tsc -b --noEmit` |
| Build | `npx vite build` |
| Tests | `npx vitest run` |
| Lint | `npx eslint .` |
| Architecture gate | `node scripts/gate.mjs` |

## Architecture (7 layers, strict isolation)

```
types → utils → ports → adapters → services → store → components
```

- **types/** — Pure types + constants. No imports from other layers.
- **utils/** — Pure utilities. No imports from services/store.
- **ports/** — 6 port interfaces (contracts). No imports from any layer.
- **adapters/** — 6 thin delegates (port → store). No business logic.
- **services/** — Domain logic. Uses ports for state mutations.
  - **services/persistence/** — idb-keyval gateway (only layer that touches idb-keyval)
  - **services/*Lifecycle.ts** — Orchestration services (infrastructure)
- **store/** — PURE STATE. 0 domain imports. Only types/utils/persistence/lifecycle.
- **components/** — UI. Can import services/store directly.

## Rules

1. **Store = pure state.** No business logic, no service imports (except persistence/lifecycle).
2. **Services = domain logic.** Use ports for mutations, never import store directly.
3. **No dynamic import fallacy.** See `architecture/POSTMORTEM_W4.md`.
4. **Gate must be 0.** `node scripts/gate.mjs` must show 0 violations before merge.
5. **Behavior unchanged.** Refactoring must not change observable behavior.

## Key files

- `architecture/POSTMORTEM_W4.md` — Why dynamic imports don't fix violations
- `scripts/gate.mjs` — Architecture gate (counts static + dynamic imports)
- `src/ports/index.ts` — Port barrel exports
- `src/adapters/index.ts` — Adapter wiring (wireAllAdapters)
- `src/main.tsx` — Composition root (wires adapters, registers store)

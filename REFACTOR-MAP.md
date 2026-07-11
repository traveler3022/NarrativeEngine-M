# REFACTOR-MAP — You Are Here

**Purpose:** This file is the entry point for any developer opening this
codebase for the first time during the refactor. It tells you, for every
file with planned changes, which RF cases affect it and which wave will
execute them.

**How to use:**
1. Before touching a file, look it up below.
2. Read the linked RF case(s) in `architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md`.
3. Read the wave definition in `architecture/phase3-refactor-planning/3.3-wave-assignment.md`.
4. Check the traceability matrix in `architecture/phase3-refactor-planning/3.6-traceability-matrix.md` to see if the RF case is already DONE.

**Legend:**
- **V** = boundary violation (from 0.15)
- **GF** = God File (from 0.16)
- **P** = persistence access point (from 0.12)

**Status:** 2026-07-11 — Phase 3 complete, Phase 4 not started.

---

## Files With Planned Refactor (sorted by wave)

### W0

| File | RF cases | Type | Lines | Description |
|------|----------|------|-------|-------------|
| `src/services/apiClient.ts` | RF-004 | V(2) |  | RF-004 violations |
| `src/services/campaign-state/divergenceRegister.ts` | RF-006 | V(1) |  | RF-006 violations |
| `src/services/campaignBundle.ts` | RF-004 | V(1) |  | RF-004 violations |
| `src/services/embedding/backfillRunner.ts` | RF-001 | V(2) |  | RF-001 violations |
| `src/services/embedding/embedder.ts` | RF-001 | V(1) |  | RF-001 violations |
| `src/services/embedding/embeddingScheduler.ts` | RF-001 | V(1) |  | RF-001 violations |
| `src/services/engine/engineRolls.ts` | RF-005 | V(1) |  | RF-005 violations |
| `src/services/image/index.ts` | RF-001, RF-006 | V(2) |  | RF-001 violations |
| `src/services/image/portrait.ts` | RF-001, RF-006 | V(2) |  | RF-001 violations |
| `src/services/lore/loreKeywordEnricher.ts` | RF-004 | V(1) |  | RF-004 violations |
| `src/services/turn/pendingCommit.ts` | RF-001, RF-004, RF-006 | V(4) |  | RF-001 violations |
| `src/services/turn/turnOrchestrator.ts` | RF-006 | V(1) |  | RF-006 violations |
| `src/services/turn/turnPostProcess.ts` | RF-004, RF-006, RF-013 | V(2)+GF | 1238 | God File — RF-013 |
| `src/services/turn/turnTypes.ts` | RF-001 | V(1) |  | RF-001 violations |

### W4

| File | RF cases | Type | Lines | Description |
|------|----------|------|-------|-------------|
| `src/store/slices/campaignSlice.ts` | RF-008, RF-007 | V(10) |  | RF-008 violations |

### W5

| File | RF cases | Type | Lines | Description |
|------|----------|------|-------|-------------|
| `src/store/campaignStore.ts` | RF-009 | V(8)+GF |  | God File — RF-009 |

### W6

| File | RF cases | Type | Lines | Description |
|------|----------|------|-------|-------------|
| `src/store/slices/chatSlice.ts` | RF-010, RF-014, RF-007 | V(3)+GF | 614 | God File — RF-014 |
| `src/store/slices/npcSlice.ts` | RF-010, RF-007 | V(5) |  | RF-010 violations |
| `src/store/slices/settingsSlice.ts` | RF-010, RF-007 | V(4) |  | RF-010 violations |
| `src/store/useAppStore.ts` | RF-010 | V(1) |  | RF-010 violations |

### W8

| File | RF cases | Type | Lines | Description |
|------|----------|------|-------|-------------|
| `src/services/npc/npcGeneration.ts` | RF-012 | GF | 1307 | God File — RF-012 |

### W11a

| File | RF cases | Type | Lines | Description |
|------|----------|------|-------|-------------|
| `src/components/context-drawer/MemoryTab.tsx` | RF-015 | GF | 916 | God File — RF-015 |

### W11b

| File | RF cases | Type | Lines | Description |
|------|----------|------|-------|-------------|
| `src/components/chat/MessageBubble.tsx` | RF-016 | GF | 781 | God File — RF-016 |

### W11c

| File | RF cases | Type | Lines | Description |
|------|----------|------|-------|-------------|
| `src/components/pc/PCCreationWizard.tsx` | RF-018 | GF | 542 | God File — RF-018 |

### W11d

| File | RF cases | Type | Lines | Description |
|------|----------|------|-------|-------------|
| `src/components/CampaignHub.tsx` | RF-019 | GF | 517 | God File — RF-019 |

### W11e

| File | RF cases | Type | Lines | Description |
|------|----------|------|-------|-------------|
| `src/components/ChatArea.tsx` | RF-017 | GF | 565 | God File — RF-017 |

## Audit Chain

For any file above, the audit chain is:

```
file → RF case → Evidence (Phase 0) → Design (Phase 2) → Wave (Phase 3.3) → Commit (Phase 4, when done)
```

Read:
- `architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md` — full RF case definitions
- `architecture/phase3-refactor-planning/3.3-wave-assignment.md` — wave goals, evidence, validation
- `architecture/phase3-refactor-planning/3.6-traceability-matrix.md` — execution status
- `architecture/phase2-architecture-design/` — design decisions
- `architecture/reverse-engineering/` — evidence base

## File Header Convention

Every file listed above should have (or will get, in W0) a header like:

```typescript
/**
 * @refactor RF-001, RF-006
 * @violations 3 (0.15/RAW_DATA.json)
 * @waves W0(advance), W1(close RF-001), W2(close RF-006)
 * @see architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md
 * @see REFACTOR-MAP.md
 */
```

At each violation line, an inline marker:

```typescript
import { useAppStore } from '@/store'; // @rf RF-001 W1 — domain→state, switch to MessagingPort
```

These markers are added in W0 (Infrastructure Wave) as the first commit.

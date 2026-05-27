# Phase 3 — Consolidate Duplications + Dead Code

**AI Tier: Cheap AI** (Haiku 4.5 / GLM-4-small / GPT-4o-mini)

All mechanical search-and-replace work. Each substitution is self-validating via tsc.

## Tasks

### 3a. Canonicalize JSON extraction

`src/services/infrastructure/jsonExtract.ts` → `extractJsonRobust()` is the canonical implementation. It handles `<think>` blocks, markdown fences, AND truncated JSON recovery.

Replace duplicate implementations:
- `src/services/payload/payloadBuilder.ts` → delete local `extractJson()`, import `extractJsonRobust`
- `src/services/lore/loreCheck.ts` → delete `extractFirstJsonObject()`, import `extractJsonRobust`
- `src/services/archive/deepArchiveSearch.ts` → delete `extractFirstJsonObject()`, import `extractJsonRobust`
- `src/services/npc/npcDetector.ts` → replace inline JSON.parse fallback with `extractJsonRobust`
- `src/services/npc/npcGeneration.ts` → already uses `llmParseJson`; verify it delegates to `extractJsonRobust` and replace if not

### 3b. useAppStore selector audit

Components destructuring the entire store cause full re-renders on any state change. Convert to per-field selectors.

Files to audit and fix:
- `src/components/BackupModal.tsx` — currently `const { backupModalOpen, ... } = useAppStore()`
- `src/components/CampaignHub.tsx` — mixed pattern
- `src/components/chat/CreateTroubleButton.tsx` — selectors + `getState()` mix
- `src/components/chat/LoreCheckModal.tsx` — mixed pattern

Pattern to apply:
```ts
// BEFORE
const { backupModalOpen, toggleBackupModal, activeCampaignId } = useAppStore();

// AFTER
const backupModalOpen = useAppStore(s => s.backupModalOpen);
const toggleBackupModal = useAppStore(s => s.toggleBackupModal);
const activeCampaignId = useAppStore(s => s.activeCampaignId);
```

Or, for components with many subscriptions, a memoized object selector:
```ts
const { open, toggle, id } = useAppStore(
  useShallow(s => ({ open: s.backupModalOpen, toggle: s.toggleBackupModal, id: s.activeCampaignId }))
);
```

Audit method: grep for `} = useAppStore()` (destructure without selector) — every hit is a fix candidate.

### 3c. Dead code sweep

From the audit:
- `getTimelineActivations()` in `src/services/archive/archiveMemory.ts` — verify no callers via grep, delete if orphaned
- Commented-out scale hack in `App.tsx` lines 44–51 — delete
- Any `console.log` left in service files from debugging — remove (keep intentional `console.warn` / `console.error`)

## Execution order

1. Phase 3a (JSON consolidation) — start here, smallest scope
2. Phase 3c (dead code) — quick
3. Phase 3b (selector audit) — most files touched, do last

## Verification

- [ ] `tsc --noEmit` exits 0
- [ ] `npm test` green
- [ ] Grep `extractFirstJsonObject\|function extractJson\b` returns only the canonical definition
- [ ] Grep `} = useAppStore()` returns zero hits in `src/components/`
- [ ] App boots, campaign loads, settings persist on reload

## Notes for the executing model

- Do NOT add `useShallow` everywhere blindly — only when there are 4+ subscriptions in one component and they're frequently read together.
- For dead code: if `git log -S "functionName"` shows it was added with intent (e.g. for a feature flag), leave it alone. Only delete clearly orphaned helpers.
- Don't rewrite error messages or change console verb (`.warn` vs `.error`) while you're in there. Stay focused.

# Phase 7 — Split campaignSlice (HIGH RISK)

**AI Tier: Strong AI** (Opus 4.7 / GPT-5 / GLM-5.1)

This is the most dangerous phase. campaignSlice owns 11+ sub-domains plus the `setActiveCampaign` hydration orchestrator that loads 9 entity types in parallel with side-effects (embedder warmup, backup timer scheduling, dedup). A plausible-looking but subtly wrong refactor can silently break campaign persistence, NPC dedup, or divergence loading without failing tsc or existing tests.

**MANDATORY PRECONDITION:** Write characterization tests before touching the slice (Sub-phase 7.0 below).

## Current state

`src/store/slices/campaignSlice.ts` (469 lines):
- NPC ledger (add/update/remove/archive/restore + embedding side-effects + dedup)
- Lore chunks
- Archive index, chapters, semantic facts
- Timeline + entities
- Game context (40+ sub-fields)
- Pinned chapter IDs
- On-stage NPC tracking
- Bookkeeping turn counter
- Active campaign ID + `setActiveCampaign` mega-hydration
- Divergence register (BROKEN: in CampaignDeps, not in slice state — fix during split)
- 3 fragmented debounced save paths

## Sub-phase 7.0 — Characterization tests (MUST DO FIRST)

Add tests in `src/store/slices/__tests__/`:

1. **Hydration test:** Mock storage with a known campaign (NPCs, lore, archive, divergence). Call `setActiveCampaign(id)`. Assert all 9 entity types end up in store state with correct values.

2. **NPC lifecycle test:** addNPC → updateNPC → archiveNPC → restoreNPC → removeNPC. Assert embedding storage is called on add/update/remove, dedup runs on add, debounced save fires.

3. **Persistence test:** Mutate context, lore, NPC ledger. Wait for debounce. Assert storage was called with correct shape for each.

4. **Divergence register test:** setDivergenceRegister → toggleDivergenceFact → pinDivergenceFact → verify persistence.

5. **Active campaign switch test:** Load campaign A, mutate state, switch to campaign B. Assert campaign A state was saved and campaign B state was loaded.

These tests pin the current behavior. They must pass BEFORE and AFTER the split, with identical assertions.

## Target structure

```
src/store/slices/
  npcSlice.ts                ← npcLedger, onStageNpcIds + actions
  loreSlice.ts               ← loreChunks + actions
  archiveSlice.ts            ← archiveIndex, chapters, semanticFacts, timeline, entities, pinnedChapterIds
  divergenceSlice.ts         ← divergenceRegister (PROPERLY in state, fix the CampaignDeps bug)
  campaignSlice.ts (trimmed) ← activeCampaignId, context, bookkeepingTurnCounter + setActiveCampaign orchestrator
src/store/
  persistence.ts             ← makeDebouncedSave() helper, consolidates 3 timers
  campaignHydration.ts       ← parallel load logic extracted from setActiveCampaign
src/hooks/
  useNPCSideEffects.ts       ← embedding storage on add/update/remove (out of slice)
```

## Slice composition

The store stays unified via `useAppStore` composition. Each slice has its own setter/getter; the store assembles them:

```ts
// src/store/useAppStore.ts
export const useAppStore = create<AppStore>()((set, get) => ({
  ...createSettingsSlice(set, get),
  ...createUISlice(set, get),
  ...createCampaignSlice(set, get),
  ...createNPCSlice(set, get),
  ...createLoreSlice(set, get),
  ...createArchiveSlice(set, get),
  ...createDivergenceSlice(set, get),
  ...createChatSlice(set, get),
}));
```

## Critical: `setActiveCampaign` decomposition

Current behavior: in one `set()` call, loads NPCs, lore, archive, chapters, divergence, timeline, entities, semantic facts, pinned chapters. Then triggers embedder warmup + backup timer scheduling.

Target: extract loading to `campaignHydration.ts`:

```ts
// src/store/campaignHydration.ts
export interface HydratedCampaign {
  npcLedger: NPCEntry[];
  loreChunks: LoreChunk[];
  archiveIndex: ArchiveIndexEntry[];
  chapters: ArchiveChapter[];
  semanticFacts: SemanticFact[];
  timeline: TimelineEvent[];
  entities: Entity[];
  divergenceRegister: DivergenceRegister;
  pinnedChapterIds: string[];
  context: GameContext;
}

export async function hydrateCampaign(campaignId: string): Promise<HydratedCampaign> {
  const [npc, lore, ...] = await Promise.all([
    offlineStorage.npc.list(campaignId),
    offlineStorage.lore.list(campaignId),
    // ... all 9 loads
  ]);
  return { npcLedger: npc, loreChunks: lore, /* ... */ };
}
```

Then `setActiveCampaign` becomes:
```ts
setActiveCampaign: async (id: string) => {
  await flushPendingSaves(get());  // save current campaign before switching
  const hydrated = await hydrateCampaign(id);
  set(state => ({
    activeCampaignId: id,
    npcLedger: hydrated.npcLedger,
    loreChunks: hydrated.loreChunks,
    archiveIndex: hydrated.archiveIndex,
    // ... commit to all slices in one set()
  }));
  scheduleEmbedderWarmup(id);
  scheduleBackupTimer(id);
}
```

Side-effects (`scheduleEmbedderWarmup`, `scheduleBackupTimer`) live in separate modules, not in the slice.

## Critical: NPC embedding side-effects

Currently `addNPC`, `updateNPC`, `removeNPC` directly call `embeddingStorage`. This couples state mutation to async I/O.

Target: slice does state-only updates. A hook `useNPCSideEffects` subscribes to npcLedger changes and reconciles embeddings:

```ts
// src/hooks/useNPCSideEffects.ts
export function useNPCSideEffects() {
  const npcLedger = useAppStore(s => s.npcLedger);
  const prevLedger = useRef<NPCEntry[]>([]);
  
  useEffect(() => {
    const diff = diffNPCLedgers(prevLedger.current, npcLedger);
    diff.added.forEach(npc => embeddingStorage.upsertNPC(npc));
    diff.updated.forEach(npc => embeddingStorage.upsertNPC(npc));
    diff.removed.forEach(npc => embeddingStorage.deleteNPC(npc.id));
    prevLedger.current = npcLedger;
  }, [npcLedger]);
}
```

Mount this hook once in `App.tsx`.

**TRADEOFF:** This decouples but introduces eventual consistency. If you'd rather keep tight coupling, leave embedding calls in the slice and accept that the slice still has side-effects. Make the call after considering test ergonomics. Either is defensible.

## Persistence consolidation

`src/store/persistence.ts`:

```ts
type Getter<T> = () => T;
type Saver<T> = (campaignId: string, value: T) => Promise<void>;

export function makeDebouncedSave<T>(
  saver: Saver<T>,
  getValue: Getter<{ campaignId: string | null; value: T }>,
  delayMs: number
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      const { campaignId, value } = getValue();
      if (campaignId) await saver(campaignId, value);
    }, delayMs);
  };
}
```

Then each slice creates its own debounced save using this helper. Adds also: `flushPendingSaves(state)` for the campaign switch path.

## Verification

- [ ] **Phase 7.0 characterization tests pass BEFORE any refactor**
- [ ] **Same tests pass AFTER refactor with no assertion changes**
- [ ] `tsc --noEmit` exits 0
- [ ] `npm test` all green
- [ ] Manual: load campaign A → mutate state (add NPC, edit lore, update context) → switch to campaign B → switch back to A → all mutations preserved
- [ ] Manual: add NPC → verify embedding storage gets it (check embedding storage size)
- [ ] Manual: delete NPC → verify embedding storage loses it
- [ ] Manual: send a turn → divergence register updates → reload app → divergences persist
- [ ] Manual: trigger backup → backup file appears on disk

## Notes for the executing model

- DO NOT skip the characterization tests. They are the only thing standing between you and silent regression.
- The `setActiveCampaign` function is 95 lines for a reason — every line does work. Map every line to its new home before deleting anything.
- If you find a side-effect in the slice you can't explain (e.g. a Date check, a counter reset), grep its history. There's usually a bug it was fixing. Don't drop it.
- The divergenceRegister-in-CampaignDeps bug is real. Fixing it during the split is correct, but document the fix in the PR description.
- Ship this as ONE PR, not sub-PRs. The slices reference each other during hydration, so a half-applied split breaks the app.
- Tag the pre-merge commit as `pre-phase-7-baseline` for easy revert.
- Required human reviewers: anyone who has previously edited campaignSlice.

## Rollback plan

If regressions appear post-merge:
1. Revert to `pre-phase-7-baseline`
2. Restore from any backup the user might have made
3. Re-attempt with smaller scope (e.g. extract only `divergenceSlice` first, leave the rest)

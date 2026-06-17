# 02 — Pool constants  🟢 CHEAP (Gemini Flash 3.5)

**Task:** Transcribe three authored corpora into one typed constants file. Pure transcription —
do NOT invent entries, do NOT add logic. The corpora already exist, fully authored, in
`Upgrade/OpusPlans/dynamic_world__npc_agency__arc_direction__DESIGN.md` §9.8 (E1-expanded,
E2-expanded, E3-expanded JSON blocks).

## What to build

Create `src/services/npc/agencyPools.ts` exporting three typed, frozen arrays.

```ts
export type PoolTier = 'default' | 'mature';

export type TraitEntry  = { text: string; tier: PoolTier; hook: string };
export type WantEntry   = { text: string; tier: PoolTier; kind: 'short' | 'medium' };
export type ActionEntry = { text: string; tier: PoolTier; context: 'peaceful' | 'dangerous' };

export const TRAIT_VOCAB: readonly TraitEntry[] = [ /* E1-expanded JSON, verbatim */ ];
export const WANT_POOL:   readonly WantEntry[]  = [ /* E2-expanded JSON, verbatim */ ];
export const ACTION_POOL: readonly ActionEntry[] = [ /* E3-expanded JSON, verbatim */ ];
```

Also export two convenience derivations (no new data):
```ts
export const TRAIT_NAMES: readonly string[]; // TRAIT_VOCAB.map(t => t.text)
export const SHORT_WANTS: readonly WantEntry[]; // WANT_POOL.filter(w => w.kind === 'short')
export const MEDIUM_WANTS: readonly WantEntry[]; // WANT_POOL.filter(w => w.kind === 'medium')
```

## Rules
- Copy the JSON entries **exactly** — same `text`, `tier`, `hook`/`kind`/`context`. Do not
  rename, merge, dedupe, or add. The doc is authoritative.
- `LONG` wants are intentionally NOT a pool (LLM-generated). Do not add a long array.
- No imports beyond what's needed for the types. No functions with logic. This file is data.
- Match surrounding code style (see any file under `src/services/npc/`).

## DONE =
- `agencyPools.ts` created; counts match the doc (TRAIT_VOCAB = 45, WANT_POOL = 57,
  ACTION_POOL = 56 — recount from the doc if unsure, the doc wins);
- `npm run build` (tsc -b) green.

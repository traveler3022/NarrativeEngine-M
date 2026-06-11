# Retrieval Eval Baseline (Plan 3)

First baseline for the retrieval-quality harness. Generated 2026-06-11 by Opus.

## How to run

```bash
npm run eval:build        # 'standard' preset: 384-dim MiniLM (bundled, offline) → vectors.standard.json
npm run eval:build:high   # 'high' preset: 768-dim bge-base (downloads from HF once) → vectors.high.json
npm run eval              # scores every built preset against cached vectors — deterministic, offline, ~0.2s
```

- **Presets mirror the app's `settings.embeddingModel`.** The assumed default is `standard` (384, the bundled model most users run). `high` (768) is a ready preset for upgraders — build its cache once and `npm run eval` picks it up automatically (no env-var juggling; cross-platform). Both caches, once built, run fully offline and deterministically.
- `npm run build` (tsc -b) and `npx vitest run` are unaffected — eval files are `*.eval.ts`, the main config only includes `*.test.ts`.
- The suite runs in the **node** environment (`vitest.eval.config.ts`), exercises the **real** retrieval ranking (cosine + MMR + floor + dedupe), and injects only two deterministic substitutes: the embedder (`embedText` → cached query vector) and the embeddings store (`getAll` → cached doc vectors).

## What v1 measures

The **pure-vector / tier-low path** for scene recall: `semanticSearchScored(campaign, [query], 'scene', 40, floor=0.30)` vs. hand-labeled ground truth, **per embedding preset**. One fixture (`callback-campaign`, 13 scenes, 3 queries) with deliberate **keyword-traps** (share words, not meaning) and **vector-traps** (share meaning, not words).

Metrics: **recall@5**, **precision@5**, and **hard violations** (any `mustNotRecall` leak = test failure, not a score). The committed baseline (`src/services/__evals__/baseline.json`) gates regressions **per preset**: a >5-point mean-recall drop fails the suite.

## Baseline numbers (k=5, floor=0.30, candidates=40) — 384 vs 768

| Query | 384 recall@5 | 768 recall@5 | note |
|---|---|---|---|
| "what did I promise the smith" | 0.00 | **0.50** | 384: floor suppression (Finding A) |
| "who betrayed us in the mountains" | 0.00 | **0.50** | 384: trap dominance (Finding B) |
| "where did we find the star-metal ore" | 1.00 | 1.00 | direct phrasing works for both |
| **mean recall@5** | **0.333** | **0.667** | 768 ≈ 2× |
| **mean precision@5** | **0.083** | **0.200** | 768 ≈ 2.4× |

## Findings (the harness earning its keep on run #1)

**A — `SEMANTIC_FLOOR_SCENE = 0.30` is too high for paraphrastic callbacks.**
For "what did I promise the smith", the single best cosine across *all* 13 scenes is **0.272** — the relevant scenes (the explicit promise, and honoring the oath) score 0.247 / 0.236. At the 0.30 floor this query returns **zero** semantic scenes, so in production it relies entirely on the lexical-recall fallback. Candidate tuning target: lower the scene floor to ~0.20, or make it adaptive (e.g. "top-k above max(0.20, bestScore·0.85)").

**B — pure vector search is fooled by traps; this is the case *for* the reranker/funnel.**
For "who betrayed us in the mountains", the metaphorical keyword-trap *"you betrayed your own fear"* ranks **#1 (0.413)** and several unrelated scenes outrank the actual betrayal (Kael's, at #6 / 0.284). Pure-vector recall@5 = 0. This is the clearest data-backed argument for the lexical layer + reranker + chapter funnel that sit on top of vectors — and the slot where the **tier-scripted** mode (next increment) should show measurable lift.

**C — direct queries are fine.** "where did we find the star-metal ore" → s012 at #1 (0.500). Vectors work well when phrasing aligns with the scene.

**D — the 768 "high" model roughly doubles vector recall — the upgrade is worth it, but doesn't replace the reranker.** bge-base lifts mean recall@5 from 0.333 → **0.667** and precision from 0.083 → **0.200**, recovering both queries MiniLM zeroed (Findings A & B each go 0 → 0.5). But it still finds only 1 of 2 relevant scenes on the hard queries and precision is still low (0.20) — so even the strong embedder is beaten by the harder trap each time. Conclusion: recommending `high` to capable devices (e.g. an S25 Ultra) is well-founded, **and** the lexical/reranker/funnel layers remain necessary on top of either model.

**Caveats:**
- 384 numbers are for the **q8-quantized** MiniLM (bundled default); 768 for q8 bge-base. Both match what the app ships (the worker uses `dtype: 'q8'` for every model).
- **Possible app gap, not yet tested:** bge retrieval models were trained expecting a query **instruction prefix** ("Represent this sentence for searching relevant passages:"). The app's worker applies no prefix for any model, so the 768 numbers above may *understate* bge's ceiling. A `high+prefix` preset would quantify it — a candidate next finding.

## What is NOT yet built (scoped for review / next increments)

- **Stages beyond semantic search:** rerank, flat/funnel recall, and final-payload metrics. The `UtilityLLM` port (Plan 4.1) + scripted responses make `tier-scripted` mode straightforward to add on this foundation — that's where Finding B's "does the reranker actually help" gets a number.
- **Token-efficiency + llm-call-count metrics:** need the full payload path; deferred with the stages above.
- **Fixtures 2 & 3:** `lore-campaign` (lore RAG + modes) and `witness-campaign` (exercises `mustNotRecall` hard-fails against Plan 2 Invariant 1). Adding a fixture = drop a `campaign.json`, run `eval:build`, add a `*.eval.ts` mirroring `callback-campaign.eval.ts`.

The determinism strategy, metric framework, baseline gate, and a first set of real findings are proven end-to-end on one fixture. Extending to the remaining stages/fixtures is mechanical.

# mobileApp Tech Debt Cleanup — Phased Upgrade Plan

This folder contains the full sweep plan for cleaning up tech debt identified in the mobileApp codebase audit. Each phase is labeled with the AI tier appropriate to execute it.

## Files in this folder

| File | Purpose |
|------|---------|
| [README.md](README.md) | This file — overview, tier definitions, execution order |
| [phase-1-services-reorganization.md](phase-1-services-reorganization.md) | Move 60+ flat service files into domain subfolders |
| [phase-2-type-llm-payloads.md](phase-2-type-llm-payloads.md) | Eliminate top `any` escapes in LLM message chain |
| [phase-3-consolidate-duplications.md](phase-3-consolidate-duplications.md) | JSON extraction + useAppStore selector audit + dead code |
| [phase-4-split-payloadbuilder.md](phase-4-split-payloadbuilder.md) | Split payloadBuilder.ts and saveFileEngine.ts |
| [phase-5-split-settings-slice.md](phase-5-split-settings-slice.md) | Split settingsSlice into AI/UI domains + theme service |
| [phase-6-split-settings-modal.md](phase-6-split-settings-modal.md) | Split SettingsModal.tsx into focused panels |
| [phase-7-split-campaign-slice.md](phase-7-split-campaign-slice.md) | **HIGH RISK** — Split campaignSlice into 5 sub-slices |
| [phase-8-extract-chatarea-hooks.md](phase-8-extract-chatarea-hooks.md) | **HIGH RISK** — Extract turn orchestration from ChatArea |

---

## AI Tier Definitions

| Tier | Models (examples) | When appropriate |
|------|-------------------|------------------|
| **Cheap AI** | Haiku 4.5, GLM-4-small, GPT-4o-mini | Pure mechanical work. tsc + grep catch all errors. Search/replace, import path updates, file moves. Low state coupling. |
| **Mid AI** | Sonnet 4.6, GPT-4o, GLM-4.6 | Multi-file coordination, type design, component extraction with state threading. Pattern-following with judgment. |
| **Strong AI** | Opus 4.7, GPT-5, GLM-5.1 | Subtle state management changes, side-effect orchestration, race condition awareness. "Looks correct but is actually wrong" failure mode is high. |

Cheap-AI phases also need a human glance at the diff. Strong-AI phases need active human review per commit AND runtime testing.

---

## Execution Order (reordered from the original plan)

Order is by safety + dependency, not phase number. Phase numbers are stable identifiers.

| Order | Phase | Tier | Why this slot |
|-------|-------|------|---------------|
| 1 | Phase 1 — Services reorganization | **Cheap AI** | Pure moves. Establishes clean foundation for everything downstream. |
| 2 | Phase 2 — Type LLM payloads | **Mid AI** | Must precede Phase 4 — typing first means the splits inherit clean types. |
| 3 | Phase 3 — Consolidate duplications | **Cheap AI** | Mechanical search/replace. Quick win, lowers cognitive load for later phases. |
| 4 | Phase 4 — Split payloadBuilder + saveFileEngine | **Mid AI** | Clear phase boundaries identified. Inherits Phase 2's types. |
| 5 | Phase 5 — Split settingsSlice | **Mid AI** | Independent of campaign state. Theme DOM mutations need care. |
| 6 | Phase 6 — Split SettingsModal | **Mid AI** | UI-only. Should follow Phase 5 so the new slices are available. |
| 7 | Phase 7 — Split campaignSlice | **Strong AI** | **Write characterization tests first.** Most dangerous refactor. |
| 8 | Phase 8 — Extract ChatArea hooks | **Strong AI** | Streaming + abort + callback orchestration. Runtime testing required. |

**Total estimated effort: ~2.5–3 weeks at focused pace.**

---

## Git Strategy

- One branch per phase: `cleanup/phase-N-short-name`
- One PR per sub-phase (e.g. Phase 1 = 9 PRs, one per domain folder)
- Squash on merge
- Each PR must pass: `npx tsc --noEmit`, `npm test`, manual smoke test described in the phase doc
- Phase 7 and 8 PRs: tag for required human review, do not auto-merge

---

## Rollback

- Phases 1, 3: safe to revert any single commit
- Phases 2, 4, 5, 6: revert the PR; downstream phases may need rebase
- **Phases 7, 8: keep the pre-refactor branch tagged** (`pre-phase-7-baseline`) for easy full rollback if regressions appear after merge

---

## Out of Scope

Things the audit identified but this plan does NOT address:

- **Test coverage gaps.** The codebase has limited tests. Adding broad coverage is its own project — this plan only requires characterization tests for Phase 7.
- **Performance work.** Virtualization for long lists (MemoryTab, archive index) is mentioned in audit but is feature work, not debt cleanup.
- **Accessibility.** ARIA live regions, keyboard nav — separate effort.
- **Error reporting infrastructure.** Centralized error logging would be valuable but is new functionality, not cleanup.
- **API middleware.** True centralized API client with auth/logging/retry — out of scope.

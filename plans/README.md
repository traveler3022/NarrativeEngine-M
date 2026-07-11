# Audit Plans — shadcn/improve

## Audit: 2026-07-11 (deep)
**Commit:** 4a3ed1f
**Effort:** deep
**Auditor:** shadcn/improve skill

## Findings Table

| # | Finding | Category | Impact | Effort | Risk | Confidence |
|---|---------|----------|--------|--------|------|------------|
| 1 | 494 `as` type casts — compiler escape hatches across entire codebase | tech-debt | M | L | MED | HIGH |
| 2 | 7 lifecycle/persistence/port/adapter modules with ZERO test coverage | tests | H | M | LOW | HIGH |
| 3 | 12 God Files >500 lines remain (types/index.ts 1152, MemoryTab 862, etc.) | tech-debt | M | L | MED | HIGH |
| 4 | 18 npm vulnerabilities (1 critical: concurrently, 3 high: xmldom, flatted, minimatch) | security | M | S | LOW | HIGH |
| 5 | 12+ circular dependencies in domain layer (madge) | tech-debt | M | M | MED | HIGH |
| 6 | Duplicate storage: idb-keyval + @capacitor/preferences overlap | tech-debt | L | M | LOW | MED |
| 7 | No AGENTS.md for agent-executed plans | dx | M | S | LOW | HIGH |
| 8 | 28 `.then()` chains (potential unawaited promises) | bugs | M | S | MED | MED |
| 9 | Empty catch blocks on critical paths (backup, haptics) | bugs | L | S | LOW | HIGH |
| 10 | No .env.example for onboarding | dx | L | S | LOW | HIGH |

## Considered and Rejected

- [DIR-01] "Missing dark mode" — not applicable: repo has full theme system with dark/light/system
- [SEC-01] "apiKey in settingsMigration.ts" — by-design: user-configured API key stored in encrypted settings, not hardcoded
- [PERF-01] "@huggingface/transformers large dep" — by-design: required for local embeddings, no alternative

## Priority Order

1. Plan 002 (tests for lifecycle/persistence/ports — critical paths untested)
2. Plan 004 (npm audit fix — security)
3. Plan 001 (type cast cleanup — tech debt)
4. Plan 003 (God File splits — tech debt)
5. Plan 007 (AGENTS.md — DX)

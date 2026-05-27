# Phase 5 — Split settingsSlice

**AI Tier: Mid AI** (Sonnet 4.6 / GPT-4o / GLM-4.6)

Two clean domain splits plus extracting DOM side-effects to a service. Mid-tier needed because the theme service has subtle window/MediaQueryList lifecycle that must not break.

## Current state

`src/store/slices/settingsSlice.ts` (369 lines) mixes:
- AI presets (encryption, validation, endpoint resolution)
- UI preferences (theme, scale, debug toggles)
- Context strategy (auto-condense, limits)
- Feature configs (embedding model, divergence budgets, NPC archive, utility timeout, rules)
- DOM side-effects (theme application, CSS variable mutation)
- Migration logic (81 lines)

## Target structure

```
src/store/slices/
  settingsSlice.ts         ← AI presets + context strategy + feature configs (~200 lines)
  uiSlice.ts               ← extend existing: theme, uiScale, debug toggles
src/services/infrastructure/
  themeService.ts          ← applyTheme(), watchSystemTheme(), resolveTheme()
src/store/
  settingsMigration.ts     ← migrateSettings() and version bumps
```

## Migration mapping

| Current state field | Goes to |
|---------------------|---------|
| `presets`, `activePresetId` | `settingsSlice` |
| `contextLimit`, `autoCondenseEnabled`, `condenseAggressiveness` | `settingsSlice` |
| `embeddingModel`, `autoExtractDivergences`, `divergenceTokenBudget`, `divergenceScanBudget` | `settingsSlice` |
| `autoArchiveStaleNPCsTurns`, `autoGenerateRuleKeywords`, `rulesBudgetPct` | `settingsSlice` |
| `utilityTimeoutSeconds`, `verboseUtilityLogging` | `settingsSlice` |
| `theme`, `uiScale`, `debugMode`, `showReasoning`, `enableDeepArchiveSearch` | `uiSlice` |
| `applyTheme()`, `watchSystemTheme()` | `themeService.ts` (called by `uiSlice` on init + setter) |
| `migrateSettings()` | `settingsMigration.ts` |

## themeService.ts shape

```ts
// src/services/infrastructure/themeService.ts
export type ThemeSetting = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export function resolveTheme(setting: ThemeSetting): ResolvedTheme;
export function applyTheme(resolved: ResolvedTheme): void;
export function watchSystemTheme(callback: (theme: ResolvedTheme) => void): () => void; // returns unsubscribe
export function applyUIScale(scale: number): void;
```

The slice imports and calls these; the slice itself contains no DOM access.

## Caller updates

Every component currently reading `settings.theme`, `settings.debugMode`, etc. needs to switch to the appropriate slice. Grep `useAppStore(s => s.settings.theme)` and similar patterns.

For backward compat, the root settings selector can stay temporarily by composing both slices:
```ts
// In useAppStore facade
settings: { ...settingsSlice, ...uiSlice }
```
But prefer direct slice access in new code.

## Persistence

Settings currently saved together via `debouncedSaveSettings`. Two options:
- **A (preferred):** Keep one combined save trigger, but the save function reads from both slices. Simpler, no behavior change.
- **B:** Separate save timers per slice. More granular but adds complexity.

Go with A unless there's a concrete reason for B.

## Verification

- [ ] `tsc --noEmit` exits 0
- [ ] `npm test` green
- [ ] Reload app: theme persists, UI scale persists, all AI presets present and decrypted
- [ ] Toggle theme between light/dark/system → DOM updates correctly
- [ ] Change UI scale slider → CSS vars update on `document.documentElement` and `#root`
- [ ] System theme change (OS-level) propagates when `theme = 'system'`

## Notes for the executing model

- The `watchSystemTheme` listener needs proper cleanup on unmount/HMR. Use a module-level singleton subscription, not per-store-init.
- Migration must run BEFORE both slices hydrate. Run it in the store init, then pass the migrated data to each slice's `initialState`.
- Don't change the on-disk encrypted format. Decryption still happens in settingsSlice.
- If a setting is genuinely ambiguous (e.g. `enableDeepArchiveSearch` — is that UI or feature?), put it where its USER is. `enableDeepArchiveSearch` is read by ChatArea/turnOrchestrator → it's a feature, goes in settingsSlice.

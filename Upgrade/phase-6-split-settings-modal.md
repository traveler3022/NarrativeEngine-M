# Phase 6 — Split SettingsModal

**AI Tier: Mid AI** (Sonnet 4.6 / GPT-4o / GLM-4.6)

UI-only refactor. No logic changes. Mid-tier needed because shared state (`expanded`, dialog state) needs careful threading and the component has 28 `useState` hooks.

## Current state

`src/components/settings/SettingsModal.tsx` is 882 lines, 28 useState, 7 distinct panels.

## Target structure

```
src/components/settings/
  SettingsModal.tsx          ← shell only (~100 lines): modal wrapper + tab navigation
  PresetsPanel.tsx           ← preset tabs + provider config group (lines ~190–246)
  GlobalSettingsPanel.tsx    ← context limit, condense, NPC archive, toggles (~250–465)
  AdvancedEmbeddingPanel.tsx ← embedding model, reindex, vector counts (~467–642)
  DebugPanel.tsx             ← utility AI logs, timeout (~644–743)
```

## Shared state handling

The current `expanded` state is reused across all 4 provider sections. Convert to:

```ts
// In PresetsPanel.tsx
const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
const toggleSection = (key: string) =>
  setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
```

Each panel manages its own local UI state. The SettingsModal shell only owns:
- Active tab/panel selection
- Modal open/close
- Save/cancel actions

## Per-panel content

### PresetsPanel.tsx
- Preset tab bar (add/remove/switch)
- Story/Summarizer/Utility/Auxiliary provider configs (existing `ProviderConfigSection` already extracted — keep using it)
- Test connection buttons
- Owns: `expandedSections`, `testResults`, `testingSection`

### GlobalSettingsPanel.tsx
- Context limit slider
- Auto-condense toggle + aggressiveness
- Divergence register budgets
- NPC auto-archive setting
- Global toggles (debug mode, show reasoning, deep archive search)
- Owns: `showConfirmDialog` for divergence reset

### AdvancedEmbeddingPanel.tsx
- Embedding model selector (standard / high)
- Download progress display
- Reindex progress display
- Vector count display
- Cache clear button + confirm
- Owns: `embeddingSwitching`, `downloadProgress`, `reindexProgress`, `vectorCounts`, `showCacheConfirm`
- **Extract the duplicated switch logic** (lines 760–790 and 810–835 in current file) into one function with a `target: 'standard' | 'high'` parameter

### DebugPanel.tsx
- Utility AI timeout setting
- Verbose logging toggle
- Recent utility call log display (via `utilityCallTracker`)
- Owns: nothing significant — mostly reads + writes to settings

## SettingsModal shell

```tsx
export function SettingsModal() {
  const [activePanel, setActivePanel] = useState<'presets' | 'global' | 'advanced' | 'debug'>('presets');
  const isOpen = useAppStore(s => s.settingsModalOpen);
  const close = useAppStore(s => s.closeSettingsModal);

  if (!isOpen) return null;

  return (
    <ModalWrapper onClose={close}>
      <PanelTabs active={activePanel} onChange={setActivePanel} />
      {activePanel === 'presets' && <PresetsPanel />}
      {activePanel === 'global' && <GlobalSettingsPanel />}
      {activePanel === 'advanced' && <AdvancedEmbeddingPanel />}
      {activePanel === 'debug' && <DebugPanel />}
    </ModalWrapper>
  );
}
```

## Verification

- [ ] `tsc --noEmit` exits 0
- [ ] `npm test` green
- [ ] Open settings modal, click through every panel → all content renders identically to before
- [ ] Add a preset, edit it, delete it — works
- [ ] Switch embedding model → download + reindex progress shows correctly
- [ ] Test connection button still works for each provider
- [ ] Toggle theme/scale → reflects everywhere immediately
- [ ] Reset divergence register confirmation dialog appears + works
- [ ] Cache clear confirmation dialog appears + works

## Notes for the executing model

- Don't change the visual layout. This is a pure refactor.
- Each panel imports from the relevant slice directly (`useAppStore(s => s.<slice>)` after Phase 5).
- Tests for SettingsModal probably target the full modal — they'll need updates to render individual panels in isolation.
- If a panel grows past ~200 lines during extraction, that's fine for this phase. Further splitting can come later.

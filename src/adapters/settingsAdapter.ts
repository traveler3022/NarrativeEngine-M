/**
 * @refactor RF-005 (infrastructure)
 * @waves W0(advance)/W1(close)
 * @see architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md#RF-005
 * @see ../ports/SettingsPort.ts
 *
 * SettingsAdapter — thin delegate from SettingsPort (read-only) to useAppStore.
 *
 * Read-only: no setter methods on this adapter. Settings are mutated
 * only via the UI → settingsSlice pathway.
 */

import { useAppStore } from '../store/useAppStore';
import type { SettingsPort } from '../ports/SettingsPort';

export function createSettingsAdapter(): SettingsPort {
  const get = () => useAppStore.getState();

  return {
    getSettings: () => get().settings,
    getActivePreset: () => get().getActivePreset(),
    getActiveImageEndpoint: () => get().getActiveImageEndpoint(),
  };
}

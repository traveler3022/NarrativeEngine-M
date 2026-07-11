/**
 * @refactor RF-005 (infrastructure)
 * @waves W0(advance)/W1(close)
 * @see architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md#RF-005
 * @see REFACTOR-MAP.md
 *
 * SettingsPort — read-only contract for domain services that need settings.
 *
 * Fixes 4 domain→state violations (image services and embedder importing
 * store to read settings, active preset, active image endpoint).
 *
 * Read-only: services must NOT mutate settings through this port.
 * Settings changes go through the UI (settings slice) only.
 */

import type { AIPreset, AppSettings, LLMProvider } from '../types';

export interface SettingsPort {
  /** Read the current app settings. */
  getSettings(): AppSettings;

  /** Read the active AI preset (undefined if none). */
  getActivePreset(): AIPreset | undefined;

  /** Read the active image endpoint (undefined if none). */
  getActiveImageEndpoint(): LLMProvider | undefined;
}

export const settingsPort: SettingsPort = {
  getSettings: () => throwNotWired('SettingsPort.getSettings'),
  getActivePreset: () => throwNotWired('SettingsPort.getActivePreset'),
  getActiveImageEndpoint: () => throwNotWired('SettingsPort.getActiveImageEndpoint'),
};

export function wireSettings(impl: SettingsPort): void {
  Object.assign(settingsPort, impl);
}

function throwNotWired(method: string): never {
  throw new Error(
    `${method} called before wireSettings(). ` +
    `Ensure wireAllAdapters() runs in main.tsx before React mounts.`
  );
}

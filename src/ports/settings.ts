/**
 * SettingsPort — read-only access to app settings for services.
 *
 * Services that need to read settings (active preset, API endpoints,
 * AI tier, embedding model) used to call useAppStore.getState().settings
 * directly — a runtime leak (services → store).
 *
 * This port flips the arrow. Services depend on the contract, not
 * the Zustand store. Write access stays in the UI layer.
 */

import type { AIPreset, LLMProvider, AiTier } from '../types';

export interface SettingsPort {
    getSettings(): Readonly<import('../types').AppSettings>;
    getActivePreset(): AIPreset | null;
    getActiveImageEndpoint(): LLMProvider | null;
    getActiveTier(): AiTier;
}

let _impl: SettingsPort | null = null;

export function registerSettings(impl: SettingsPort): void {
    _impl = impl;
}

function impl(): SettingsPort {
    if (!_impl) {
        throw new Error(
            'SettingsPort not wired. Call registerSettings() ' +
            'from app bootstrap before any service uses it.'
        );
    }
    return _impl;
}

export const settings: SettingsPort = {
    getSettings:          () => impl().getSettings(),
    getActivePreset:      () => impl().getActivePreset(),
    getActiveImageEndpoint: () => impl().getActiveImageEndpoint(),
    getActiveTier:        () => impl().getActiveTier(),
};

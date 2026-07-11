/**
 * Settings persistence — extracted from settingsSlice.ts (W4 redo).
 *
 * This is a persistence function, not reactive state. Moved here so services
 * can import it without a state→domain boundary violation.
 */

import type { AppSettings } from '../../types';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { encryptSettingsProviders, decryptSettingsProviders, decryptSettingsPresets } from '../infrastructure';

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedSaveSettings(settings: AppSettings, activeCampaignId: string | null) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        const encryptedProviders = await encryptSettingsProviders(settings.providers);
        const encryptedSettings = { ...settings, providers: encryptedProviders };

        idbSet('nn_settings', { settings: encryptedSettings, activeCampaignId })
            .catch((e) => { console.error(e); });
    }, 500);
}

export { idbGet, idbSet, encryptSettingsProviders, decryptSettingsProviders, decryptSettingsPresets };

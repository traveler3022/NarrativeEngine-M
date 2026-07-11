/**
 * @refactor RF-001, RF-006
 * @violations 2 (see architecture/reverse-engineering/0.15-architecture-violations/RAW_DATA.json)
 * @waves W0(advance)/W1(close); W0(advance)/W2(close)
 * @ports MessagingPort, NotificationPort
 * @see architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md
 * @see architecture/phase3-refactor-planning/3.6-traceability-matrix.md
 * @see REFACTOR-MAP.md
 */

import { npcCapability, campaignContextPort, settingsPort, notificationPort } from '../../ports';
import { generateImage } from './imageClient';
import { composeImagePrompt } from './composePrompt';
import { imageStorage } from '../storage/imageStorage';

export async function generateNPCPortrait(npcId: string): Promise<void> {
    const provider = settingsPort.getActiveImageEndpoint();
    if (!provider) {
        notificationPort.warning('No Image Generation AI configured. Add one in Settings \u2192 Presets.');
        return;
    }

    const campaignId = campaignContextPort.getActiveCampaignId();
    if (!campaignId) {
        notificationPort.warning('No active campaign');
        return;
    }

    const npcLedger = npcCapability.getNPCLedger();
    const npc = npcLedger.find(n => n.id === npcId);
    if (!npc) {
        notificationPort.warning('NPC not found');
        return;
    }

    if (!npc.appearance?.trim() && !npc.appearanceTags?.trim()) {
        notificationPort.warning('Add an appearance description before generating a portrait');
        return;
    }

    const settings = settingsPort.getSettings();
    const composed = composeImagePrompt({
        portraitNpcId: npcId,
        npcLedger,
        stylePrompt: settings.imageStylePrompt,
        negativePrompt: settings.imageNegativePrompt,
    });

    const dataUrl = await generateImage(provider, composed.prompt, {
        size: '1024x1536',
        negativePrompt: composed.negativePrompt,
        ...(composed.seed !== undefined ? { seed: composed.seed } : {}),
    });

    await imageStorage.storePortrait(campaignId, npcId, dataUrl);
    npcCapability.updateNPC(npcId, { portrait: true });
}

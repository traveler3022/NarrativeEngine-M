/**
 * @refactor RF-001, RF-006
 * @violations 2 (see architecture/reverse-engineering/0.15-architecture-violations/RAW_DATA.json)
 * @waves W0(advance)/W1(close); W0(advance)/W2(close)
 * @ports MessagingPort, NotificationPort
 * @see architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md
 * @see architecture/phase3-refactor-planning/3.6-traceability-matrix.md
 * @see REFACTOR-MAP.md
 */

import type { CharacterProfileState, SceneSteer } from '../../types';
import { messagingPort, npcCapability, campaignContextPort, settingsPort, notificationPort } from '../../ports';
import { generateImage } from './imageClient';
import { composeImagePrompt } from './composePrompt';
import { imageStorage } from '../storage/imageStorage';

export async function illustrateMessage(messageId: string, steer?: SceneSteer): Promise<void> {
    const settings = settingsPort.getSettings();
    const preset = settings.presets.find(p => p.id === settings.activePresetId);
    if (!preset) {
        notificationPort.warning('No active preset found');
        return;
    }

    const imageProvider = settingsPort.getActiveImageEndpoint();
    if (!imageProvider) {
        notificationPort.warning('No Image Generation AI configured in this preset. Add one in Settings → Presets.');
        return;
    }

    const campaignId = campaignContextPort.getActiveCampaignId();
    if (!campaignId) return;

    const message = messagingPort.getMessageById(messageId);
    if (!message || message.role !== 'assistant') return;

    if (message.image?.status === 'pending') return;

    const npcLedger = npcCapability.getNPCLedger();
    const onStageNpcIds = npcCapability.getOnStageNPCIds();
    const context = campaignContextPort.getContext();
    const pc = (context?.characterProfile as CharacterProfileState | undefined)?.identity;

    const composed = composeImagePrompt({
        sceneText: message.displayContent || message.content,
        npcLedger,
        pc,
        onStageNpcIds,
        stylePrompt: settings.imageStylePrompt,
        negativePrompt: settings.imageNegativePrompt,
        steer,
    });

    if (!composed.prompt) {
        notificationPort.warning('No text to illustrate');
        return;
    }

    messagingPort.attachImage(messageId, {
        status: 'pending',
        prompt: composed.prompt,
        createdAt: Date.now(),
        steer,
    });

    try {
        const dataUrl = await generateImage(imageProvider, composed.prompt, {
            negativePrompt: composed.negativePrompt,
            ...(composed.seed !== undefined ? { seed: composed.seed } : {}),
        });

        await imageStorage.store(campaignId, messageId, dataUrl);

        messagingPort.attachImage(messageId, {
            status: 'ready',
            prompt: composed.prompt,
            createdAt: Date.now(),
            steer,
        });
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        messagingPort.attachImage(messageId, {
            status: 'error',
            prompt: composed.prompt,
            createdAt: Date.now(),
            error: errorMessage,
            steer,
        });
        notificationPort.error(`Illustration failed: ${errorMessage}`);
    }
}

import type { NPCEntry, CharacterProfileState, SceneSteer } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { generateImage } from './imageClient';
import { composeImagePrompt } from './composePrompt';
import { imageStorage } from '../storage/imageStorage';
import { toast } from '../../components/Toast';

export async function illustrateMessage(messageId: string, steer?: SceneSteer): Promise<void> {
    const state = useAppStore.getState();
    const preset = state.settings.presets.find(p => p.id === state.settings.activePresetId);
    if (!preset) {
        toast.warning('No active preset found');
        return;
    }

    const imageProvider = state.getActiveImageEndpoint();
    if (!imageProvider) {
        toast.warning('No Image Generation AI configured in this preset. Add one in Settings → Presets.');
        return;
    }

    const campaignId = state.activeCampaignId;
    if (!campaignId) return;

    const message = state.messages.find(m => m.id === messageId);
    if (!message || message.role !== 'assistant') return;

    if (message.image?.status === 'pending') return;

    const npcLedger = (state as unknown as { npcLedger: NPCEntry[] }).npcLedger ?? [];
    const onStageNpcIds = (state as unknown as { onStageNpcIds?: string[] }).onStageNpcIds ?? [];
    const pc = (state.context?.characterProfile as CharacterProfileState | undefined)?.identity;

    const composed = composeImagePrompt({
        sceneText: message.displayContent || message.content,
        npcLedger,
        pc,
        onStageNpcIds,
        stylePrompt: state.settings.imageStylePrompt,
        negativePrompt: state.settings.imageNegativePrompt,
        steer,
    });

    if (!composed.prompt) {
        toast.warning('No text to illustrate');
        return;
    }

    useAppStore.getState().setMessageImage(messageId, {
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

        useAppStore.getState().setMessageImage(messageId, {
            status: 'ready',
            prompt: composed.prompt,
            createdAt: Date.now(),
            steer,
        });
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        useAppStore.getState().setMessageImage(messageId, {
            status: 'error',
            prompt: composed.prompt,
            createdAt: Date.now(),
            error: errorMessage,
            steer,
        });
        toast.error(`Illustration failed: ${errorMessage}`);
    }
}

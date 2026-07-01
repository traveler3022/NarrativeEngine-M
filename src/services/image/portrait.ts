import { useAppStore } from '../../store/useAppStore';
import { generateImage } from './imageClient';
import { composeImagePrompt } from './composePrompt';
import { imageStorage } from '../storage/imageStorage';
import { toast } from '../../components/Toast';

export async function generateNPCPortrait(npcId: string): Promise<void> {
    const state = useAppStore.getState();
    const provider = state.getActiveImageEndpoint();
    if (!provider) {
        toast.warning('No Image Generation AI configured. Add one in Settings \u2192 Presets.');
        return;
    }

    const campaignId = state.activeCampaignId;
    if (!campaignId) {
        toast.warning('No active campaign');
        return;
    }

    const npcLedger = (state as unknown as { npcLedger: import('../../types').NPCEntry[] }).npcLedger;
    const npc = npcLedger.find(n => n.id === npcId);
    if (!npc) {
        toast.warning('NPC not found');
        return;
    }

    if (!npc.appearance?.trim() && !npc.appearanceTags?.trim()) {
        toast.warning('Add an appearance description before generating a portrait');
        return;
    }

    const composed = composeImagePrompt({
        portraitNpcId: npcId,
        npcLedger,
        stylePrompt: state.settings.imageStylePrompt,
        negativePrompt: state.settings.imageNegativePrompt,
    });

    const dataUrl = await generateImage(provider, composed.prompt, {
        size: '1024x1536',
        negativePrompt: composed.negativePrompt,
        ...(composed.seed !== undefined ? { seed: composed.seed } : {}),
    });

    await imageStorage.storePortrait(campaignId, npcId, dataUrl);
    useAppStore.getState().updateNPC(npcId, { portrait: true });
}
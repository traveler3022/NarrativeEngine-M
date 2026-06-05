import { useAppStore } from '../../store/useAppStore';
import { generateImage } from './imageClient';
import { imageStorage } from '../storage/imageStorage';
import { toast } from '../../components/Toast';

const PORTRAIT_NEGATIVE = 'multiple people, group, crowd, split screen, twins, double, text, watermark, signature';
const DEFAULT_STYLE = 'fantasy illustration, cinematic lighting, detailed, no text, no watermark, no UI, no speech bubbles';

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

    if (!npc.appearance?.trim()) {
        toast.warning('Add an appearance description before generating a portrait');
        return;
    }

    const style = state.settings.imageStylePrompt?.trim() || DEFAULT_STYLE;
    const parts = [style, `portrait of ${npc.name}`, npc.appearance.trim()].filter(Boolean);
    const prompt = parts.join('. ');

    const userNeg = state.settings.imageNegativePrompt?.trim();
    const negativePrompt = userNeg
        ? `${PORTRAIT_NEGATIVE}, ${userNeg}`
        : PORTRAIT_NEGATIVE;

    const seed = npc.portraitSeed;

    const dataUrl = await generateImage(provider, prompt, {
        size: '1024x1536',
        negativePrompt,
        ...(seed !== undefined ? { seed } : {}),
    });

    await imageStorage.storePortrait(campaignId, npcId, dataUrl);
    useAppStore.getState().updateNPC(npcId, { portrait: true });
}
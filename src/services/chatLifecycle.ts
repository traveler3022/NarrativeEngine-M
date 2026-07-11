/**
 * @refactor RF-010 (real extraction — W5)
 * @waves W5
 * @see architecture/POSTMORTEM_W4.md
 *
 * Chat lifecycle service — owns image cleanup and token counting logic.
 *
 * EXTRACTED from chatSlice.ts. The slice previously imported storage and
 * infrastructure services directly (state→domain violation).
 */

import { imageStorage } from './storage/imageStorage';
import { countTokens } from './infrastructure';

/** Delete image for a single message. */
export function deleteMessageImage(campaignId: string | null, messageId: string): void {
    if (campaignId) {
        imageStorage.delete(campaignId, messageId).catch(() => {});
    }
}

/** Delete images for multiple messages. */
export function deleteMessageImages(campaignId: string | null, messageIds: string[]): void {
    if (campaignId) {
        for (const id of messageIds) {
            imageStorage.delete(campaignId, id).catch(() => {});
        }
    }
}

/** Delete all images for a campaign. */
export function deleteAllCampaignImages(campaignId: string | null): void {
    if (campaignId) {
        imageStorage.deleteAll(campaignId).catch(() => {});
    }
}

/** Count tokens in a text string. */
export function countTextTokens(text: string): number {
    return countTokens(text);
}

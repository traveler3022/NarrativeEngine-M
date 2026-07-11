/**
 * Ports barrel — single import point for all domain-side port consumers.
 *
 * Services should:
 *   import { messagingPort, npcCapability } from '@/ports';
 *
 * NOT:
 *   import { messagingPort } from '@/ports/MessagingPort';
 *   import { npcCapability } from '@/ports/NPCCapability';
 *
 * (The barrel keeps import paths stable if files move.)
 */

export { messagingPort, wireMessaging } from './MessagingPort';
export type { MessagingPort } from './MessagingPort';

export { npcCapability, wireNPC } from './NPCCapability';
export type { NPCCapability } from './NPCCapability';

export { archivePort, wireArchive } from './ArchivePort';
export type { ArchivePort } from './ArchivePort';

export { campaignContextPort, wireCampaignContext } from './CampaignContextPort';
export type { CampaignContextPort } from './CampaignContextPort';

export { settingsPort, wireSettings } from './SettingsPort';
export type { SettingsPort } from './SettingsPort';

export { notificationPort, wireNotifications } from './NotificationPort';
export type { NotificationPort } from './NotificationPort';

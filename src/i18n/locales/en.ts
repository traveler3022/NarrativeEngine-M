/**
 * English translations. Keys are flat dotted strings.
 *
 * Adding a new string:
 *   1. Pick a key like 'chat.input.placeholder'.
 *   2. Add it here with the English value.
 *   3. Add the same key to fa.ts with the Persian value.
 *
 * If a key is missing here, t() returns the key itself (so it's obvious
 * during development that something needs translating).
 */

export const en: Record<string, string> = {
  // ── Common ──────────────────────────────────────────────────────────
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.confirm': 'Confirm',
  'common.close': 'Close',
  'common.back': 'Back',
  'common.done': 'Done',
  'common.loading': 'Loading…',
  'common.error': 'Error',
  'common.retry': 'Retry',
  'common.send': 'Send',
  'common.edit': 'Edit',
  'common.rename': 'Rename',
  'common.search': 'Search',
  'common.none': 'None',
  'common.yes': 'Yes',
  'common.no': 'No',

  // ── MobileNavBar ────────────────────────────────────────────────────
  'nav.chat': 'Chat',
  'nav.context': 'Context',
  'nav.npcs': 'NPCs',
  'nav.settings': 'Settings',

  // ── Settings ────────────────────────────────────────────────────────
  'settings.title': 'Settings',
  'settings.providers': 'Providers',
  'settings.presets': 'Presets',
  'settings.global': 'Global',
  'settings.advanced': 'Advanced',
  'settings.debug': 'Debug',
  'settings.language': 'Language',
  'settings.language.desc': 'Choose the app language',

  // ── Settings → Global ───────────────────────────────────────────────
  'settings.global.title': 'Global Preferences',
  'settings.global.maxContext': 'Max Context (Tokens)',
  'settings.global.matureMode': 'Mature Mode',
  'settings.global.matureMode.desc': 'Unlocks mature-tier NPC traits, wants & reactions (darker, adult themes).',
  'settings.global.tts': 'Read Aloud (TTS)',
  'settings.global.tts.desc': 'Speaker button on GM messages reads reply aloud. Uses your device\'s built-in voice (offline, no download).',
  'settings.global.tts.rate': 'Playback Speed',
  'settings.global.tts.rateSlow': '0.5× slow',
  'settings.global.tts.rateFast': '2× fast',

  // ── Chat ────────────────────────────────────────────────────────────
  'chat.input.placeholder': 'What do you do?',
  'chat.send': 'Send',
  'chat.stop': 'Stop',
  'chat.regenerate': 'Regenerate',
  'chat.retry': 'Retry',
  'chat.thinking': 'Thinking…',
  'chat.empty': 'Start your adventure',
  'chat.empty.desc': 'Type below to begin your story',
  'chat.copy': 'Copy',
  'chat.copied': 'Copied',
  'chat.readAloud': 'Read aloud',
  'chat.stopReading': 'Stop reading',

  // ── Campaign Hub ────────────────────────────────────────────────────
  'campaign.title': 'Campaigns',
  'campaign.new': 'New Campaign',
  'campaign.edit': 'Edit Campaign',
  'campaign.name': 'Campaign Name',
  'campaign.cover': 'Cover Image',
  'campaign.cover.drop': 'Click or drop image',
  'campaign.lore': 'Lore File',
  'campaign.lore.desc': 'Split into chunks by ### headers for dynamic retrieval',
  'campaign.rules': 'Rules File',
  'campaign.rules.desc': 'System rules — always-active context',
  'campaign.loot': 'Loot File',
  'campaign.loot.desc': 'World loot tree — powers the Loot button (manual drops)',
  'campaign.delete': 'Delete this campaign? All data (chat, lore, saves) will be lost.',
  'campaign.noBackups': 'No backups yet',
  'campaign.noBackups.desc': 'Create your first backup above',
  'campaign.play': 'Play',
  'campaign.lastPlayed': 'Last played',
  'campaign.continue': 'Continue',

  // ── Header ──────────────────────────────────────────────────────────
  'header.roll': 'Roll (1d20)',
  'header.advantage': 'Advantage (2d20 ↑)',
  'header.disadvantage': 'Disadvantage (2d20 ↓)',
  'header.tier': 'Tier',
  'header.tier.lite': 'Lite',
  'header.tier.pro': 'Pro',
  'header.tier.max': 'Max',

  // ── NPC ─────────────────────────────────────────────────────────────
  'npc.ledger.title': 'NPC Ledger',
  'npc.ledger.empty': 'No NPCs yet',
  'npc.ledger.empty.desc': 'NPCs will appear here as they enter your story',
  'npc.add': 'Add NPC',
  'npc.hasDrives': 'Has drives',
  'npc.hasTriggers': 'Has triggers',

  // ── Backup ──────────────────────────────────────────────────────────
  'backup.title': 'Campaign Backups',
  'backup.create': 'Create Backup',
  'backup.restore': 'Restore',
  'backup.export': 'Export',
  'backup.import': 'Import',

  // ── Context Drawer ──────────────────────────────────────────────────
  'context.title': 'Context',
  'context.lore': 'Lore',
  'context.chapters': 'Chapters',
  'context.facts': 'Facts',
  'context.pinned': 'Pinned',
};

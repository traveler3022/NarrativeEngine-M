/**
 * @refactor RF-011 (infrastructure skeleton)
 * @waves W0(skeleton)/W7(close)
 * @see architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md#RF-011
 * @see REFACTOR-MAP.md
 *
 * Persistence service — single gateway to idb-keyval.
 *
 * W0 (this file): skeleton only. Re-exports existing storage modules
 * so consumers can start importing from one place. No logic moves yet.
 *
 * W5: campaignStore.ts functions move here (campaignStore, loreStore,
 *     npcStore, settingsStore).
 * W7: all 11 idb-keyval access points consolidated here. Existing
 *     services/storage/* files renamed to services/persistence/*Store.ts.
 *
 * Per 2.5 Repository Design: this is a SERVICE, not a PORT. Evidence
 * (0.13) shows idb-keyval is the only persistence technology with no
 * replacement planned — a port would be speculative (YAGNI).
 */

// Re-export existing storage modules so consumers can migrate gradually.
// In W7, these files will be physically moved into services/persistence/.
export { imageStorage } from '../storage/imageStorage';
export { embeddingStorage, EMBEDDING_VERSION } from '../storage/embeddingStorage';
export type { VectorLike, EmbeddingRecord } from '../storage/embeddingStorage';
export { archiveStorage } from '../storage/archiveStorage';
export { backupStorage } from '../storage/backupStorage';
export type { BackupData } from '../storage/backupStorage';
export { chapterStorage } from '../storage/chapterStorage';
export { entityStorage } from '../storage/entityStorage';
export { factStorage } from '../storage/factStorage';
export { timelineStorage } from '../storage/timelineStorage';

// campaignStore functions (currently in store/campaignStore.ts) will
// be re-exported here once W5 moves them. For now, consumers continue
// to import from store/campaignStore.ts directly.

/**
 * Audit helper — returns the list of files that currently import
 * idb-keyval directly. Used by gate.mjs to track progress toward
 * the W7 goal: 11 access points → 1.
 *
 * Run: node scripts/audit-persistence.mjs
 */
export const PERSISTENCE_AUDIT_HINT =
  'Run `node scripts/audit-persistence.mjs` to count direct idb-keyval imports.';

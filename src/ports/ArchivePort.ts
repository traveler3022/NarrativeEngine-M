/**
 * @refactor RF-003 (infrastructure)
 * @waves W0(advance)/W1(close)
 * @see architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md#RF-003
 * @see REFACTOR-MAP.md
 *
 * ArchivePort — contract between domain services and archive/divergence state.
 *
 * Fixes 3 domain→state violations (turnPostProcess and pendingCommit
 * importing store to replace chapters, archive index, divergence register).
 */

import type {
  ArchiveChapter,
  ArchiveIndexEntry,
  DivergenceRegister,
  SemanticFact,
} from '../types';

export interface ArchivePort {
  /** Replace the entire chapter list. */
  replaceChapters(chapters: ArchiveChapter[]): void;

  /** Replace the archive index entries. */
  replaceArchiveIndex(entries: ArchiveIndexEntry[]): void;

  /** Replace the semantic facts list. */
  replaceSemanticFacts(facts: SemanticFact[]): void;

  /** Clear the pinned-chapter set. */
  clearPinnedChapters(): void;

  /** Replace the divergence register. */
  replaceDivergenceRegister(reg: DivergenceRegister): void;

  /** Flag a message as diverging into alternate branches. */
  flagMessageDivergence(messageId: string, branchIds: string[]): void;
}

export const archivePort: ArchivePort = {
  replaceChapters: () => throwNotWired('ArchivePort.replaceChapters'),
  replaceArchiveIndex: () => throwNotWired('ArchivePort.replaceArchiveIndex'),
  replaceSemanticFacts: () => throwNotWired('ArchivePort.replaceSemanticFacts'),
  clearPinnedChapters: () => throwNotWired('ArchivePort.clearPinnedChapters'),
  replaceDivergenceRegister: () => throwNotWired('ArchivePort.replaceDivergenceRegister'),
  flagMessageDivergence: () => throwNotWired('ArchivePort.flagMessageDivergence'),
};

export function wireArchive(impl: ArchivePort): void {
  Object.assign(archivePort, impl);
}

function throwNotWired(method: string): never {
  throw new Error(
    `${method} called before wireArchive(). ` +
    `Ensure wireAllAdapters() runs in main.tsx before React mounts.`
  );
}

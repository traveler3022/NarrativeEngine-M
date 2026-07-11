/**
 * @refactor RF-003 (infrastructure)
 * @waves W0(advance)/W1(close)
 * @see architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md#RF-003
 * @see ../ports/ArchivePort.ts
 *
 * ArchiveAdapter — thin delegate from ArchivePort to useAppStore
 * (archiveSlice + chatSlice divergence section).
 */

import { useAppStore } from '../store/useAppStore';
import type { ArchivePort } from '../ports/ArchivePort';

export function createArchiveAdapter(): ArchivePort {
  const get = () => useAppStore.getState();

  return {
    replaceChapters: (chapters) => get().setChapters(chapters),
    replaceArchiveIndex: (entries) => get().setArchiveIndex(entries),
    replaceSemanticFacts: (facts) => get().setSemanticFacts(facts),
    clearPinnedChapters: () => get().clearPinnedChapters(),
    replaceDivergenceRegister: (reg) => get().setDivergenceRegister(reg),
    flagMessageDivergence: (messageId, branchIds) =>
      get().updateMessageDivergence(messageId, branchIds),
  };
}

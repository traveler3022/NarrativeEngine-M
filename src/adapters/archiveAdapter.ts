import { useAppStore } from '../store/useAppStore';
import { registerArchive, type ArchivePort } from '../ports/archive';

export const archiveAdapter: ArchivePort = {
    setArchiveIndex:     (entries) => useAppStore.getState().setArchiveIndex(entries),
    setChapters:         (chapters) => useAppStore.getState().setChapters(chapters),
    setSemanticFacts:    (facts) => useAppStore.getState().setSemanticFacts(facts),
    clearPinnedChapters: () => useAppStore.getState().clearPinnedChapters(),
    getArchiveIndex:     () => useAppStore.getState().archiveIndex,
    getChapters:         () => useAppStore.getState().chapters,
    getSemanticFacts:    () => useAppStore.getState().semanticFacts,
    getTimeline:         () => useAppStore.getState().timeline,
    getPinnedChapterIds: () => useAppStore.getState().pinnedChapterIds,
    getLoreChunks:       () => useAppStore.getState().loreChunks,
    getPinnedExcerpts:   () => useAppStore.getState().pinnedExcerpts,
};

export function wireArchive(): void { registerArchive(archiveAdapter); }

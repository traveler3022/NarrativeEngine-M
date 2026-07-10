import { useAppStore } from '../store/useAppStore';
import { registerArchive, type ArchivePort } from '../ports/archive';
import {
    toggleChapter, toggleCategory,
} from '../services/campaign-state';

export const archiveAdapter: ArchivePort = {
    replaceChapters:           (c) => useAppStore.getState().setChapters(c),
    replaceArchiveIndex:       (e) => useAppStore.getState().setArchiveIndex(e),
    replaceSemanticFacts:      (f) => useAppStore.getState().setSemanticFacts(f),
    clearPinnedChapters:       () => useAppStore.getState().clearPinnedChapters(),
    pinChapter:                (id) => useAppStore.getState().pinChapter(id),
    replaceDivergenceRegister: (r) => useAppStore.getState().setDivergenceRegister(r),
    flagMessageDivergence:     (id, divs) => useAppStore.getState().updateMessageDivergence(id, divs),
    toggleDivergenceChapter:   (id, on) => {
        const reg = useAppStore.getState().divergenceRegister;
        useAppStore.getState().setDivergenceRegister(toggleChapter(reg, id, on));
    },
    toggleDivergenceCategory:  (id, cat, on) => {
        const reg = useAppStore.getState().divergenceRegister;
        useAppStore.getState().setDivergenceRegister(toggleCategory(reg, id, cat, on));
    },
    getChapters:               () => useAppStore.getState().chapters,
    getArchiveIndex:           () => useAppStore.getState().archiveIndex,
    getPinnedChapterIds:       () => useAppStore.getState().pinnedChapterIds,
    getSemanticFacts:          () => useAppStore.getState().semanticFacts,
    getDivergenceRegister:     () => useAppStore.getState().divergenceRegister,
};

export function wireArchive(): void { registerArchive(archiveAdapter); }

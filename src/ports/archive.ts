/**
 * ArchivePort — state access for archive + divergence.
 *
 * Merged per Port Review: Divergence is a view of Archive, not a
 * separate domain. pendingCommit needs setChapters, setArchiveIndex,
 * setDivergenceRegister, etc. — all in one port.
 */

import type {
    ArchiveChapter, ArchiveIndexEntry, SemanticFact,
    DivergenceRegister, DivergenceCategory,
} from '../types';

export interface ArchivePort {
    // Commands — archive
    replaceChapters(chapters: ArchiveChapter[]): void;
    replaceArchiveIndex(entries: ArchiveIndexEntry[]): void;
    replaceSemanticFacts(facts: SemanticFact[]): void;
    clearPinnedChapters(): void;
    pinChapter(chapterId: string): void;

    // Commands — divergence
    replaceDivergenceRegister(register: DivergenceRegister): void;
    flagMessageDivergence(messageId: string, divergenceIds: string[]): void;
    toggleDivergenceChapter(chapterId: string, on: boolean): void;
    toggleDivergenceCategory(chapterId: string, category: DivergenceCategory, on: boolean): void;

    // Queries
    getChapters(): readonly ArchiveChapter[];
    getArchiveIndex(): readonly ArchiveIndexEntry[];
    getPinnedChapterIds(): readonly string[];
    getSemanticFacts(): readonly SemanticFact[];
    getDivergenceRegister(): DivergenceRegister;
}

let _impl: ArchivePort | null = null;

export function registerArchive(impl: ArchivePort): void { _impl = impl; }

function impl(): ArchivePort {
    if (!_impl) throw new Error('ArchivePort not wired.');
    return _impl;
}

export const archive: ArchivePort = {
    replaceChapters:           (c) => impl().replaceChapters(c),
    replaceArchiveIndex:       (e) => impl().replaceArchiveIndex(e),
    replaceSemanticFacts:      (f) => impl().replaceSemanticFacts(f),
    clearPinnedChapters:       () => impl().clearPinnedChapters(),
    pinChapter:                (id) => impl().pinChapter(id),
    replaceDivergenceRegister: (r) => impl().replaceDivergenceRegister(r),
    flagMessageDivergence:     (id, divs) => impl().flagMessageDivergence(id, divs),
    toggleDivergenceChapter:   (id, on) => impl().toggleDivergenceChapter(id, on),
    toggleDivergenceCategory:  (id, cat, on) => impl().toggleDivergenceCategory(id, cat, on),
    getChapters:               () => impl().getChapters(),
    getArchiveIndex:           () => impl().getArchiveIndex(),
    getPinnedChapterIds:       () => impl().getPinnedChapterIds(),
    getSemanticFacts:          () => impl().getSemanticFacts(),
    getDivergenceRegister:     () => impl().getDivergenceRegister(),
};

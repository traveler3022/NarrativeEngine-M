/**
 * ArchivePort — state access for the archive/timeline/lore-chunk data a
 * committed turn reads and updates.
 *
 * pendingCommit.ts used to read/write archiveIndex, chapters, semanticFacts,
 * timeline, pinnedChapterIds, loreChunks, and pinnedExcerpts directly via
 * useAppStore.getState() — a services → store leak. This is distinct from
 * ChapterRepositoryPort (chapter *persistence*, i.e. loadChapters from
 * storage) — this port is in-memory state access, the same distinction
 * documented in architecture/WAVE_2_5_AUDIT.md for why Repository wasn't
 * enough for the remaining leaks.
 */

import type { ArchiveIndexEntry, ArchiveChapter, SemanticFact, TimelineEvent, LoreChunk, PinnedExcerpt } from '../types';

export interface ArchivePort {
    // Commands
    setArchiveIndex(entries: ArchiveIndexEntry[]): void;
    setChapters(chapters: ArchiveChapter[]): void;
    setSemanticFacts(facts: SemanticFact[]): void;
    clearPinnedChapters(): void;

    // Queries
    getArchiveIndex(): readonly ArchiveIndexEntry[];
    getChapters(): readonly ArchiveChapter[];
    getSemanticFacts(): readonly SemanticFact[];
    getTimeline(): readonly TimelineEvent[];
    getPinnedChapterIds(): readonly string[];
    getLoreChunks(): readonly LoreChunk[];
    getPinnedExcerpts(): readonly PinnedExcerpt[];
}

let _impl: ArchivePort | null = null;

export function registerArchive(impl: ArchivePort): void { _impl = impl; }

function impl(): ArchivePort {
    if (!_impl) throw new Error('ArchivePort not wired. Call registerArchive() from app bootstrap.');
    return _impl;
}

export const archive: ArchivePort = {
    setArchiveIndex:      (entries) => impl().setArchiveIndex(entries),
    setChapters:          (chapters) => impl().setChapters(chapters),
    setSemanticFacts:     (facts) => impl().setSemanticFacts(facts),
    clearPinnedChapters:  () => impl().clearPinnedChapters(),
    getArchiveIndex:      () => impl().getArchiveIndex(),
    getChapters:          () => impl().getChapters(),
    getSemanticFacts:     () => impl().getSemanticFacts(),
    getTimeline:          () => impl().getTimeline(),
    getPinnedChapterIds:  () => impl().getPinnedChapterIds(),
    getLoreChunks:        () => impl().getLoreChunks(),
    getPinnedExcerpts:    () => impl().getPinnedExcerpts(),
};

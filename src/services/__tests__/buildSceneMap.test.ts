import { describe, it, expect } from 'vitest';
import { buildSceneMap } from '../divergenceRegister';
import type { ChatMessage, ArchiveIndexEntry } from '../../types';

function makeMsg(id: string, role: 'user' | 'assistant' | 'system'): ChatMessage {
    return { id, role, content: `msg-${id}`, timestamp: 0 };
}

function makeArchiveEntry(sceneId: string): ArchiveIndexEntry {
    return { sceneId, timestamp: 0, keywords: [], npcsMentioned: [], userSnippet: '' };
}

describe('buildSceneMap', () => {
    it('maps user messages to archive entries from the tail', () => {
        const messages: ChatMessage[] = [
            makeMsg('u1', 'user'),
            makeMsg('a1', 'assistant'),
            makeMsg('u2', 'user'),
            makeMsg('a2', 'assistant'),
            makeMsg('u3', 'user'),
            makeMsg('a3', 'assistant'),
            makeMsg('u4', 'user'),
            makeMsg('a4', 'assistant'),
        ];

        const archiveIndex: ArchiveIndexEntry[] = [
            makeArchiveEntry('001'),
            makeArchiveEntry('002'),
        ];

        const { sceneIdsByMessageId } = buildSceneMap(archiveIndex, messages);

        expect(sceneIdsByMessageId['u3']).toBe('001');
        expect(sceneIdsByMessageId['u4']).toBe('002');
        expect(sceneIdsByMessageId['u1']).toBeUndefined();
        expect(sceneIdsByMessageId['u2']).toBeUndefined();
    });

    it('maps all user messages when counts match', () => {
        const messages: ChatMessage[] = [
            makeMsg('u1', 'user'),
            makeMsg('a1', 'assistant'),
            makeMsg('u2', 'user'),
            makeMsg('a2', 'assistant'),
        ];

        const archiveIndex: ArchiveIndexEntry[] = [
            makeArchiveEntry('010'),
            makeArchiveEntry('020'),
        ];

        const { sceneIdsByMessageId } = buildSceneMap(archiveIndex, messages);

        expect(sceneIdsByMessageId['u1']).toBe('010');
        expect(sceneIdsByMessageId['u2']).toBe('020');
    });

    it('maps assistant messages to preceding user scene', () => {
        const messages: ChatMessage[] = [
            makeMsg('u1', 'user'),
            makeMsg('a1', 'assistant'),
        ];

        const archiveIndex: ArchiveIndexEntry[] = [
            makeArchiveEntry('005'),
        ];

        const { sceneIdsByMessageId } = buildSceneMap(archiveIndex, messages);

        expect(sceneIdsByMessageId['u1']).toBe('005');
        expect(sceneIdsByMessageId['a1']).toBe('005');
    });

    it('returns no user mapping when archiveIndex is empty', () => {
        const messages: ChatMessage[] = [
            makeMsg('u1', 'user'),
            makeMsg('a1', 'assistant'),
        ];

        const { sceneIdsByMessageId } = buildSceneMap([], messages);

        expect(sceneIdsByMessageId['u1']).toBeUndefined();
        expect(sceneIdsByMessageId['a1']).toBe('000');
    });

    it('returns empty mapping when there are no user messages', () => {
        const messages: ChatMessage[] = [
            makeMsg('a1', 'assistant'),
        ];

        const archiveIndex: ArchiveIndexEntry[] = [
            makeArchiveEntry('001'),
        ];

        const { sceneIdsByMessageId } = buildSceneMap(archiveIndex, messages);

        expect(sceneIdsByMessageId['a1']).toBe('000');
    });
});

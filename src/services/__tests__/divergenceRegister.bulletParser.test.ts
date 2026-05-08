import { describe, it, expect } from 'vitest';
import { parseBulletDivergences, stripReasoning } from '../divergenceRegister';

describe('parseBulletDivergences', () => {
    const validScenes = ['791', '792', '793'];

    it('parses a well-formed bullet', () => {
        const raw = '- [entity_state | Gorlok | scene:791] Gorlok was slain by the party';
        const result = parseBulletDivergences(raw, validScenes);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            category: 'entity_state',
            subject: 'Gorlok',
            divergence: 'Gorlok was slain by the party',
            sceneRef: '791',
            supersedes: undefined,
            parseError: undefined,
        });
    });

    it('parses bullet without supersedes', () => {
        const raw = '[world_change | Bridge of Khazad | scene:792] The bridge was destroyed';
        const result = parseBulletDivergences(raw, validScenes);
        expect(result).toHaveLength(1);
        expect(result[0].supersedes).toBeUndefined();
    });

    it('parses bullet with supersedes', () => {
        const raw = '- [entity_state | Gorlok | scene:792 | supersedes:div_abc123] Gorlok is actually alive';
        const result = parseBulletDivergences(raw, validScenes);
        expect(result).toHaveLength(1);
        expect(result[0].supersedes).toBe('div_abc123');
    });

    it('strips <think reasoning block and parses bullet', () => {
        const raw = '<think\nLet me analyze the scene...\nThe NPC Gorlok died.\n</think >\n- [entity_state | Gorlok | scene:791] Gorlok was slain';
        const result = parseBulletDivergences(raw, validScenes);
        expect(result).toHaveLength(1);
        expect(result[0].divergence).toBe('Gorlok was slain');
        expect(result[0].parseError).toBeUndefined();
    });

    it('strips markdown code fence and parses bullet', () => {
        const raw = '```json\n- [entity_state | Gorlok | scene:791] Gorlok was slain\n```';
        const result = parseBulletDivergences(raw, validScenes);
        expect(result).toHaveLength(1);
        expect(result[0].divergence).toBe('Gorlok was slain');
        expect(result[0].parseError).toBeUndefined();
    });

    it('returns parse-error rows for garbage lines alongside valid bullets', () => {
        const raw = `- [entity_state | Gorlok | scene:791] Gorlok was slain
this is garbage
- [world_change | Bridge | scene:792] Bridge destroyed`;
        const result = parseBulletDivergences(raw, validScenes);
        expect(result).toHaveLength(3);
        expect(result[0].parseError).toBeUndefined();
        expect(result[1].parseError).toBe(true);
        expect(result[1].divergence).toBe('this is garbage');
        expect(result[2].parseError).toBeUndefined();
    });

    it('falls back to entity_state for unknown category', () => {
        const raw = '- [stuff | Gorlok | scene:791] Something happened';
        const result = parseBulletDivergences(raw, validScenes);
        expect(result).toHaveLength(1);
        expect(result[0].category).toBe('entity_state');
    });

    it('falls back to first valid scene for unknown sceneRef', () => {
        const raw = '- [entity_state | Gorlok | scene:999] Something happened';
        const result = parseBulletDivergences(raw, validScenes);
        expect(result).toHaveLength(1);
        expect(result[0].sceneRef).toBe('791');
    });

    it('returns empty array for NONE', () => {
        const raw = 'NONE';
        const result = parseBulletDivergences(raw, validScenes);
        expect(result).toEqual([]);
    });

    it('skips leading commentary lines without bracket', () => {
        const raw = `Here are the new divergences:
- [entity_state | Gorlok | scene:791] Gorlok was slain`;
        const result = parseBulletDivergences(raw, validScenes);
        expect(result).toHaveLength(1);
        expect(result[0].divergence).toBe('Gorlok was slain');
    });

    it('returns empty array for empty string', () => {
        const result = parseBulletDivergences('', ['791']);
        expect(result).toEqual([]);
    });
});

describe('stripReasoning', () => {
    it('removes think blocks', () => {
        const raw = '<think\nsome reasoning\n</think >\n- hello';
        expect(stripReasoning(raw)).toBe('- hello');
    });

    it('extracts content from code fences', () => {
        const raw = '```json\n- hello\n```';
        expect(stripReasoning(raw)).toBe('- hello');
    });

    it('returns trimmed original when no patterns match', () => {
        const raw = '  plain text  ';
        expect(stripReasoning(raw)).toBe('plain text');
    });
});

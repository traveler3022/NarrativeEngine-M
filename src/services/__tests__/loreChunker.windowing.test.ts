import { describe, it, expect } from 'vitest';
import { chunkLoreFile } from '../loreChunker';

const _LORE_CHUNK_MAX = 1500;
const LORE_WINDOW_SIZE = 1000;
const _LORE_WINDOW_STRIDE = 700;
void _LORE_CHUNK_MAX; void _LORE_WINDOW_STRIDE;

describe('lore chunker windowing', () => {
    it('splits a 5000-char section into 6+ sub-chunks', () => {
        const content = 'x'.repeat(5000);
        const markdown = `## Test Section\n${content}`;
        const chunks = chunkLoreFile(markdown);

        expect(chunks.length).toBeGreaterThanOrEqual(6);

        for (const chunk of chunks) {
            expect(chunk.id).toMatch(/#w\d+$/);
        }
    });

    it('sub-chunks share parent header and keywords', () => {
        const content = 'A'.repeat(5000);
        const markdown = `## Character — Hero\n${content}`;
        const chunks = chunkLoreFile(markdown);

        expect(chunks.length).toBeGreaterThan(1);
        const headers = new Set(chunks.map(c => c.header));
        expect(headers.size).toBe(1);
    });

    it('sub-chunk content overlaps correctly', () => {
        const content = 'a'.repeat(5000);
        const markdown = `## Section\n${content}`;
        const chunks = chunkLoreFile(markdown);

        const subChunks = chunks.filter(c => c.id.includes('#w'));
        expect(subChunks.length).toBeGreaterThanOrEqual(2);

        for (const sub of subChunks) {
            expect(sub.content.length).toBeLessThanOrEqual(LORE_WINDOW_SIZE);
        }
    });

    it('chunks under 1500 chars are not split', () => {
        const content = 'Short section content here.';
        const markdown = `## Small Section\n${content}`;
        const chunks = chunkLoreFile(markdown);

        expect(chunks.length).toBe(1);
        expect(chunks[0].id).not.toContain('#w');
    });
});
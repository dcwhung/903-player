import { UnauthorizedError, ValidationError, VersionConflictError } from '../../api/client';
import { changedKeys, dirtyLabels, mergeRescan, problemOf, rebaseDraft } from './entryDraft';

describe('entryDraft', () => {
    it('should list changed definition keys and images', () => {
        const saved = { definition: { name: 'a', summary: 'x', hosts: ['甲'] }, images: {} };
        const draft = {
            definition: { name: 'a', summary: 'y', hosts: ['甲', '乙'] },
            images: { 'disc.webp': 'h.webp' },
        };
        expect(changedKeys(saved, draft)).toEqual(['summary', 'hosts', 'images']);
        expect(dirtyLabels(['summary', 'hosts', 'images', 'theme', 'audio2'])).toEqual([
            '簡介',
            '主持',
            '圖片',
            '其他',
        ]);
    });

    it('should classify save errors', () => {
        expect(problemOf(new VersionConflictError(412, 'x')).type).toBe('conflict');
        expect(problemOf(new ValidationError(422, 'x', { details: 'arcs[0].id bad' }))).toEqual({
            type: 'invalid',
            detail: 'arcs[0].id bad',
        });
        expect(problemOf(new Error('boom'))).toEqual({ type: 'failed', message: 'boom' });
        expect(problemOf(new UnauthorizedError(401, 'not logged in'))).toEqual({
            type: 'unauthorized',
        });
    });

    it('should keep local edits over a rescan result', () => {
        const saved = { name: 'a', summary: 'x', arcs: [1] };
        const local = { name: 'a', summary: 'mine', arcs: [1] };
        const scanned = { name: 'a', summary: 'x', arcs: [1, 2] };
        expect(mergeRescan(saved, local, scanned)).toEqual({
            name: 'a',
            summary: 'mine',
            arcs: [1, 2],
        });
    });

    it('should keep a locally removed field removed over a rescan result', () => {
        const saved = { name: 'a', summary: 'x' };
        const local = { name: 'a' };
        const scanned = { name: 'b', summary: 'x' };
        expect(mergeRescan(saved, local, scanned)).toEqual({ name: 'b' });
    });

    describe('rebaseDraft (AU-020)', () => {
        const base = { definition: { name: 'a', order: 1 }, images: { disc: 'old.webp' } };

        it('should take the new saved value for fields and images the user did not change', () => {
            const draft = { definition: { name: 'mine', order: 1 }, images: { disc: 'old.webp' } };
            const next = {
                definition: { name: 'a', order: 5 },
                images: { disc: 'old.webp', tile: 't.webp' },
            };
            expect(rebaseDraft(base, draft, next)).toEqual({
                definition: { name: 'mine', order: 5 },
                images: { disc: 'old.webp', tile: 't.webp' },
            });
        });

        it('should keep the values the user changed, per image file too', () => {
            const draft = { definition: { name: 'a', order: 2 }, images: { disc: 'mine.webp' } };
            const next = { definition: { name: 'b', order: 5 }, images: { disc: 'theirs.webp' } };
            expect(rebaseDraft(base, draft, next)).toEqual({
                definition: { name: 'b', order: 2 },
                images: { disc: 'mine.webp' },
            });
        });
    });
});

import { UnauthorizedError, ValidationError, VersionConflictError } from '../../api/client';
import { changedKeys, dirtyLabels, mergeRescan, problemOf } from './entryDraft';

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
});

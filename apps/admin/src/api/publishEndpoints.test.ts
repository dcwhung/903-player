import { ValidationError } from './client';
import { changesPath, isStaleSelection } from './publishEndpoints';

describe('publishEndpoints', () => {
    it('should URL-encode the selection into GET /api/changes', () => {
        const selection = {
            content: ['newArc/a/b'],
            branding: { icon: true, text: false },
            banner: false,
        };
        const path = changesPath(selection);
        expect(path.startsWith('/api/changes?selection=')).toBe(true);
        expect(JSON.parse(new URLSearchParams(path.split('?')[1]).get('selection') ?? '')).toEqual(
            selection,
        );
        expect(changesPath()).toBe('/api/changes');
    });

    it('should treat only 422 unknown selection keys as a stale page', () => {
        expect(isStaleSelection(new ValidationError(422, 'unknown selection keys'))).toBe(true);
        expect(isStaleSelection(new ValidationError(422, 'banner: bad'))).toBe(false);
        expect(isStaleSelection(new Error('unknown selection keys'))).toBe(false);
    });
});

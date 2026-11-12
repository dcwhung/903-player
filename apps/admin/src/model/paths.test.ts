import { arcEditorPath, dramaEditorPath } from './paths';

describe('paths (S-828)', () => {
    it('should keep plain IDs as they are', () => {
        expect(arcEditorPath('lancy', 'arc-01')).toBe('/dramas/lancy/arcs#arc-01');
        expect(dramaEditorPath('lancy')).toBe('/dramas/lancy');
    });

    it('should encode IDs as one path segment / hash', () => {
        expect(arcEditorPath('a/b c', '#x?')).toBe('/dramas/a%2Fb%20c/arcs#%23x%3F');
        expect(dramaEditorPath('a/b?')).toBe('/dramas/a%2Fb%3F');
    });
});

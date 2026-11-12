import { arcEditorPath, dramaEditorPath, renamedDramaPath } from './paths';

describe('paths (S-828)', () => {
    it('should keep plain IDs as they are', () => {
        expect(arcEditorPath('lancy', 'arc-01')).toBe('/dramas/lancy/arcs#arc-01');
        expect(dramaEditorPath('lancy')).toBe('/dramas/lancy');
    });

    it('should encode IDs as one path segment / hash', () => {
        expect(arcEditorPath('a/b c', '#x?')).toBe('/dramas/a%2Fb%20c/arcs#%23x%3F');
        expect(dramaEditorPath('a/b?')).toBe('/dramas/a%2Fb%3F');
    });

    it('should swap the encoded drama ID and keep the tab (S-857)', () => {
        expect(renamedDramaPath('/dramas/lancy/arcs', 'lancy', 'nancy')).toBe('/dramas/nancy/arcs');
        expect(renamedDramaPath('/dramas/a%20b/schedule', 'a b', 'c d')).toBe(
            '/dramas/c%20d/schedule',
        );
        expect(renamedDramaPath('/dramas/a%20b', 'a b', 'c')).toBe('/dramas/c');
    });

    it('should leave other paths alone (S-857)', () => {
        expect(renamedDramaPath('/shows/lancy', 'lancy', 'nancy')).toBe('/shows/lancy');
        expect(renamedDramaPath('/dramas/lancy-2', 'lancy', 'nancy')).toBe('/dramas/lancy-2');
        expect(renamedDramaPath('/dramas/%E0%A4', 'x', 'y')).toBe('/dramas/%E0%A4');
    });
});

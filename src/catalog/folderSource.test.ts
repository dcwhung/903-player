import { foldersFromGlobs } from './folderSource';

describe('foldersFromGlobs', () => {
    const source = foldersFromGlobs(
        { './golden/drama.json': { name: '黃金少年' }, './chisee/drama.json': { name: '芝See' } },
        {
            './golden/tile.webp': '/a/tile.webp',
            './golden/season-1-disc.webp': '/a/s1.webp',
            './chisee/tile.webp': '/b/tile.webp',
        },
        'src/dramas',
    );

    it('groups one folder per definition file, with its own images keyed by file name', () => {
        expect(source.folders()).toEqual([
            {
                id: 'golden',
                source: 'src/dramas/golden/drama.json',
                definition: { name: '黃金少年' },
                images: { 'tile.webp': '/a/tile.webp', 'season-1-disc.webp': '/a/s1.webp' },
            },
            {
                id: 'chisee',
                source: 'src/dramas/chisee/drama.json',
                definition: { name: '芝See' },
                images: { 'tile.webp': '/b/tile.webp' },
            },
        ]);
    });

    it('gives a folder without images an empty map', () => {
        const [only] = foldersFromGlobs({ './x/show.json': {} }, {}, 'src/shows').folders();
        expect(only).toEqual({
            id: 'x',
            source: 'src/shows/x/show.json',
            definition: {},
            images: {},
        });
    });

    it('refuses a glob key that is not ./<folder>/<file>', () => {
        expect(() => foldersFromGlobs({ './deep/er/x.json': {} }, {}, 'src').folders()).toThrow(
            'unexpected glob key ./deep/er/x.json',
        );
    });
});

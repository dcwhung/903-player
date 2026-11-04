import { foldersFromGlobs } from './folderSource';

describe('foldersFromGlobs', () => {
    const source = foldersFromGlobs(
        {
            '../library/golden/drama.json': { name: '黃金少年' },
            '../library/chisee/drama.json': { name: '芝See' },
        },
        {
            '../library/golden/tile.webp': '/a/tile.webp',
            '../library/golden/season-1-disc.webp': '/a/s1.webp',
            '../library/chisee/tile.webp': '/b/tile.webp',
        },
        'src/catalog/dramas/library',
    );

    it('groups one folder per definition file, with its own images keyed by file name', () => {
        expect(source.folders()).toEqual([
            {
                id: 'golden',
                source: 'src/catalog/dramas/library/golden/drama.json',
                definition: { name: '黃金少年' },
                images: { 'tile.webp': '/a/tile.webp', 'season-1-disc.webp': '/a/s1.webp' },
            },
            {
                id: 'chisee',
                source: 'src/catalog/dramas/library/chisee/drama.json',
                definition: { name: '芝See' },
                images: { 'tile.webp': '/b/tile.webp' },
            },
        ]);
    });

    it('gives a folder without images an empty map', () => {
        const [only] = foldersFromGlobs(
            { '../library/x/show.json': {} },
            {},
            'src/catalog/shows/library',
        ).folders();
        expect(only).toEqual({
            id: 'x',
            source: 'src/catalog/shows/library/x/show.json',
            definition: {},
            images: {},
        });
    });

    it('refuses a glob key that is not ../library/<folder>/<file>', () => {
        expect(() =>
            foldersFromGlobs({ '../library/deep/er/x.json': {} }, {}, 'src').folders(),
        ).toThrow('unexpected glob key ../library/deep/er/x.json');
    });
});

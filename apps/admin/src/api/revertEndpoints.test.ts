import { mockApi } from '../../tests/renderApp';
import { getEntry } from './endpoints';
import { revertEntry } from './revertEndpoints';

const PUBLISHED = { definition: { name: '舊名' }, images: { 'tile.webp': 'a.webp' } };

describe('revertEndpoints', () => {
    it('should POST the items with If-Match to …/revert', async () => {
        const fetchMock = mockApi({
            'POST /api/entries/dramas/lancy/revert': () => ({
                body: { updatedAt: 'v2', draft: false, warnings: { missingEpisodeIds: [] } },
                etag: '"v2"',
            }),
        });
        const { data, etag } = await revertEntry(
            'dramas',
            'lancy',
            [{ arc: 'half', field: 'tile' }],
            '"v1"',
        );
        expect(data.updatedAt).toBe('v2');
        expect(etag).toBe('"v2"');
        const init = fetchMock.mock.calls[0]![1]!;
        expect(JSON.parse(init.body as string)).toEqual({
            items: [{ arc: 'half', field: 'tile' }],
        });
        expect(new Headers(init.headers).get('if-match')).toBe('"v1"');
    });

    it('should keep GET entry published as publishedVersion (not the list boolean)', async () => {
        mockApi({
            'GET /api/entries/shows/waves': () => ({
                body: {
                    definition: {},
                    images: {},
                    draft: false,
                    updatedAt: 'v1',
                    published: PUBLISHED,
                },
                etag: '"v1"',
            }),
            'GET /api/entries/shows/night': () => ({
                body: {
                    definition: {},
                    images: {},
                    draft: false,
                    updatedAt: 'v1',
                    published: null,
                },
            }),
        });
        const waves = await getEntry('shows', 'waves');
        expect(waves.publishedVersion).toEqual(PUBLISHED);
        expect(waves).not.toHaveProperty('published');
        expect(await getEntry('shows', 'night')).not.toHaveProperty('publishedVersion');
    });
});

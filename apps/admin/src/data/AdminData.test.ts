import { mockApi } from '../../tests/renderApp';
import { loadAllEntries } from './AdminData';

const DETAIL_URL = '/api/entries?detail=1';
const UPDATED_AT = '2026-11-08T00:00:00Z';
const ETAG = `"${UPDATED_AT}"`;
const IMAGES = { 'tile.webp': 'a.webp' };
const PUBLISHED_VERSION = { definition: { name: '舊名' }, images: IMAGES };

const summary = (kind: string, id: string, extra: Record<string, unknown> = {}) => ({
    kind,
    id,
    name: id,
    enabled: true,
    draft: false,
    updatedAt: UPDATED_AT,
    published: true,
    ...extra,
});

const urlsOf = (api: ReturnType<typeof mockApi>) => api.mock.calls.map(([url]) => url);

/** AU-024：全部 entry 一個 request 讀晒，唔再逐個 GET */
describe('loadAllEntries', () => {
    it('should load every entry with one request', async () => {
        const detail = { definition: { name: '新名' }, images: IMAGES, etag: ETAG };
        const api = mockApi({
            [`GET ${DETAIL_URL}`]: () => ({
                body: {
                    entries: [
                        summary('dramas', 'golden', {
                            ...detail,
                            publishedArcs: ['season-1'],
                            publishedVersion: PUBLISHED_VERSION,
                        }),
                        summary('shows', 'badgirl', {
                            ...detail,
                            published: false,
                            publishedVersion: null,
                        }),
                    ],
                },
            }),
        });
        expect(await loadAllEntries()).toEqual([
            {
                kind: 'dramas',
                id: 'golden',
                definition: { name: '新名' },
                images: IMAGES,
                draft: false,
                updatedAt: UPDATED_AT,
                etag: ETAG,
                published: true,
                publishedArcs: ['season-1'],
                publishedVersion: PUBLISHED_VERSION,
            },
            {
                kind: 'shows',
                id: 'badgirl',
                definition: { name: '新名' },
                images: IMAGES,
                draft: false,
                updatedAt: UPDATED_AT,
                etag: ETAG,
                published: false,
                publishedArcs: undefined,
            },
        ]);
        expect(urlsOf(api)).toEqual([DETAIL_URL]);
    });

    it('should fall back to one GET per entry when the API predates detail=1', async () => {
        const api = mockApi({
            [`GET ${DETAIL_URL}`]: () => ({ body: { entries: [summary('shows', 'badgirl')] } }),
            'GET /api/entries/shows/badgirl': () => ({
                body: {
                    definition: { name: '節目' },
                    images: IMAGES,
                    draft: false,
                    updatedAt: UPDATED_AT,
                    published: null,
                },
                etag: ETAG,
            }),
        });
        expect(await loadAllEntries()).toEqual([
            {
                kind: 'shows',
                id: 'badgirl',
                definition: { name: '節目' },
                images: IMAGES,
                draft: false,
                updatedAt: UPDATED_AT,
                etag: ETAG,
                published: true,
                publishedArcs: undefined,
            },
        ]);
        expect(urlsOf(api)).toEqual([DETAIL_URL, '/api/entries/shows/badgirl']);
    });
});

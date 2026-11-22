import { mockApi } from '../../../tests/renderApp';
import { ApiError, ValidationError, VersionConflictError } from '../../api/client';
import type { LoadedEntry } from '../../api/types';
import type { Draft } from './entryDraft';
import { persist, RenamedSaveError } from './persist';

const ARCS = [
    { id: 'drama-01-01', name: 'Season 1', episodes: 3 },
    { id: 'drama-01-extra', name: 'Extra', episodes: 1 },
];

const ENTRY: LoadedEntry = {
    kind: 'dramas',
    id: 'drama-01',
    definition: { name: '新劇', arcs: ARCS },
    images: { 'tile.jpg': 'aaa.webp' },
    draft: true,
    updatedAt: 'v1',
    etag: '"v1"',
};

/** 草稿：改咗名，短篇 ID 仲係舊嘅 <舊劇 ID>-NN */
const DRAFT: Draft = { definition: { name: '蘭茜', arcs: ARCS }, images: ENTRY.images };

const RENAMED_ARCS = [{ ...ARCS[0], id: 'lancy-01' }, ARCS[1]];

const RENAME = 'POST /api/entries/dramas/drama-01/rename';
const PUT_OLD = 'PUT /api/entries/dramas/drama-01';
const PUT_NEW = 'PUT /api/entries/dramas/lancy';

const renamed = () => ({ body: { id: 'lancy', updatedAt: 'v2' }, etag: '"v2"' });
const saved = (updatedAt: string) => ({
    body: { updatedAt, draft: true, warnings: { missingEpisodeIds: [] } },
});

const callsOf = (api: ReturnType<typeof mockApi>) =>
    api.mock.calls.map(([path, init]) => `${init?.method ?? 'GET'} ${path}`);

const putOf = (api: ReturnType<typeof mockApi>) => {
    const call = api.mock.calls.find(([, init]) => init?.method === 'PUT');
    return {
        body: JSON.parse(String(call?.[1]?.body)) as Draft,
        ifMatch: new Headers(call?.[1]?.headers).get('if-match'),
    };
};

const target = { kind: 'dramas', id: 'drama-01', entry: ENTRY } as const;

/** rename 成功之後 PUT 失敗 → RenamedSaveError */
const failAfterRename = async (put: { status: number; body: unknown }) => {
    mockApi({ [RENAME]: renamed, [PUT_NEW]: () => put });
    const error: unknown = await persist(target, DRAFT, 'lancy').catch((e: unknown) => e);
    if (!(error instanceof RenamedSaveError)) throw new Error(`unexpected: ${String(error)}`);
    return error;
};

describe('persist', () => {
    it('should PUT without a rename when the ID is unchanged', async () => {
        const api = mockApi({ [PUT_OLD]: () => saved('v2') });
        const result = await persist(target, DRAFT, 'drama-01');
        expect(callsOf(api)).toEqual([PUT_OLD]);
        expect(putOf(api)).toEqual({ body: DRAFT, ifMatch: '"v1"' });
        expect(result.entry).toMatchObject({ id: 'drama-01', etag: '"v2"', ...DRAFT });
    });

    it('should not rename when no new ID is given', async () => {
        const api = mockApi({ [PUT_OLD]: () => saved('v2') });
        await persist(target, DRAFT);
        expect(callsOf(api)).toEqual([PUT_OLD]);
    });

    it('should rename first, then PUT the arc IDs the server renamed (AU-013)', async () => {
        const api = mockApi({ [RENAME]: renamed, [PUT_NEW]: () => saved('v3') });
        const result = await persist(target, DRAFT, 'lancy');
        expect(callsOf(api)).toEqual([RENAME, PUT_NEW]);
        expect(putOf(api)).toEqual({
            body: { definition: { name: '蘭茜', arcs: RENAMED_ARCS }, images: ENTRY.images },
            ifMatch: '"v2"',
        });
        expect(result.entry).toMatchObject({
            id: 'lancy',
            updatedAt: 'v3',
            etag: '"v3"',
            definition: { name: '蘭茜', arcs: RENAMED_ARCS },
        });
    });

    it('should not PUT at all when the rename is the only change (S-1396)', async () => {
        const api = mockApi({ [RENAME]: renamed });
        const unchanged: Draft = { definition: ENTRY.definition, images: ENTRY.images };
        const result = await persist(target, unchanged, 'lancy');
        expect(callsOf(api)).toEqual([RENAME]);
        // rename 已經將所有嘢存好：版本 / ETag 用 rename 嘅回應，冇 warnings
        expect(result).toEqual({
            entry: {
                ...ENTRY,
                id: 'lancy',
                updatedAt: 'v2',
                etag: '"v2"',
                definition: { name: '新劇', arcs: RENAMED_ARCS },
            },
            warnings: [],
        });
    });

    it('should surface the renamed entry and the remapped draft when the PUT fails (AU-013)', async () => {
        const error = await failAfterRename({ status: 409, body: { error: 'arc scheduled' } });
        // server 而家儲存嘅版本：新 ID / ETag，已儲存 definition 嘅短篇 ID 跟住改
        expect(error.entry).toEqual({
            ...ENTRY,
            id: 'lancy',
            updatedAt: 'v2',
            etag: '"v2"',
            definition: { name: '新劇', arcs: RENAMED_ARCS },
        });
        expect(error.draft).toEqual({
            definition: { name: '蘭茜', arcs: RENAMED_ARCS },
            images: ENTRY.images,
        });
        expect(error.cause).toBeInstanceOf(ApiError);
        expect(error.cause).toMatchObject({ status: 409 });
    });

    it.each([
        [422, ValidationError],
        [412, VersionConflictError],
    ])('should keep the typed cause of a %i after the rename', async (status, type) => {
        const error = await failAfterRename({ status, body: { error: 'nope' } });
        expect(error.cause).toBeInstanceOf(type);
    });

    it('should surface a network failure of the PUT after the rename the same way', async () => {
        const failure = new TypeError('Failed to fetch');
        vi.stubGlobal(
            'fetch',
            vi.fn((path: string) =>
                path.endsWith('/rename')
                    ? Promise.resolve(
                          new Response(JSON.stringify(renamed().body), {
                              headers: { 'content-type': 'application/json', etag: '"v2"' },
                          }),
                      )
                    : Promise.reject(failure),
            ),
        );
        const error: unknown = await persist(target, DRAFT, 'lancy').catch((e: unknown) => e);
        expect(error).toBeInstanceOf(RenamedSaveError);
        expect((error as RenamedSaveError).entry.id).toBe('lancy');
    });

    it('should throw the plain error and PUT nothing when the rename itself fails', async () => {
        const api = mockApi({ [RENAME]: () => ({ status: 409, body: { error: 'exists' } }) });
        const error: unknown = await persist(target, DRAFT, 'lancy').catch((e: unknown) => e);
        expect(error).toBeInstanceOf(ApiError);
        expect(error).not.toBeInstanceOf(RenamedSaveError);
        expect(callsOf(api)).toEqual([RENAME]);
    });
});

import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { mockApi } from '../../../tests/renderApp';
import type { Draft } from './entryDraft';
import { useEntryEditor } from './useEntryEditor';

const PATH = '/api/entries/shows/morning';

const detail = (updatedAt: string, definition: Record<string, unknown>) => ({
    definition,
    images: {},
    draft: true,
    updatedAt,
});

const saved = (updatedAt: string) => ({
    body: { updatedAt, draft: true, warnings: { missingEpisodeIds: [] } },
});

const setDisc = (draft: Draft): Draft => ({
    ...draft,
    images: { ...draft.images, disc: 'd.webp' },
});

const headerOf = (init: RequestInit | undefined, name: string) =>
    new Headers(init?.headers).get(name);

const putCalls = (api: ReturnType<typeof mockApi>) =>
    api.mock.calls.filter(([, init]) => init?.method === 'PUT');

/** PUT body 嘅 definition + images（其他欄位唔理） */
const bodyOf = (init: RequestInit | undefined): Draft => {
    const { definition, images } = JSON.parse(String(init?.body)) as Draft;
    return { definition, images };
};

const loadEditor = async () => {
    const view = renderHook(() => useEntryEditor('shows', 'morning'));
    await waitFor(() => expect(view.result.current.entry).not.toBeNull());
    return view;
};

describe('useEntryEditor', () => {
    describe('patchSaved', () => {
        it('should PUT only the patch on top of the saved version when the ETag matches', async () => {
            const api = mockApi({
                [`GET ${PATH}`]: () => ({ body: detail('v1', { name: '早晨' }), etag: '"v1"' }),
                [`PUT ${PATH}`]: () => saved('v2'),
            });
            const { result } = await loadEditor();
            act(() => result.current.setDefinition((d) => ({ ...d, name: '未儲存' })));

            let ok = false;
            await act(async () => {
                ok = await result.current.patchSaved(setDisc);
            });

            expect(ok).toBe(true);
            const [put] = putCalls(api);
            expect(headerOf(put?.[1], 'if-match')).toBe('"v1"');
            expect(bodyOf(put?.[1])).toEqual({
                definition: { name: '早晨' },
                images: { disc: 'd.webp' },
            });
            expect(result.current.entry?.etag).toBe('"v2"');
            expect(result.current.draft?.definition).toEqual({ name: '未儲存' });
            expect(result.current.draft?.images).toEqual({ disc: 'd.webp' });
        });

        it('should re-read the entry and retry with the new ETag when the PUT gets 412', async () => {
            let gets = 0;
            let puts = 0;
            const api = mockApi({
                [`GET ${PATH}`]: () => {
                    gets += 1;
                    return gets === 1
                        ? { body: detail('v1', { name: '早晨' }), etag: '"v1"' }
                        : {
                              body: detail('v2', { name: '早晨', theme: { bg: '#000' } }),
                              etag: '"v2"',
                          };
                },
                [`PUT ${PATH}`]: () => {
                    puts += 1;
                    return puts === 1 ? { status: 412, body: { error: 'stale' } } : saved('v3');
                },
            });
            const { result } = await loadEditor();

            let ok = false;
            await act(async () => {
                ok = await result.current.patchSaved(setDisc);
            });

            expect(ok).toBe(true);
            const [first, second] = putCalls(api);
            expect(headerOf(first?.[1], 'if-match')).toBe('"v1"');
            expect(headerOf(second?.[1], 'if-match')).toBe('"v2"');
            expect(bodyOf(second?.[1])).toEqual({
                definition: { name: '早晨', theme: { bg: '#000' } },
                images: { disc: 'd.webp' },
            });
            expect(result.current.entry?.etag).toBe('"v3"');
            expect(result.current.status.problem).toBeUndefined();
        });

        it('should return false and report a conflict when the retry also gets 412', async () => {
            const api = mockApi({
                [`GET ${PATH}`]: () => ({ body: detail('v1', { name: '早晨' }), etag: '"v1"' }),
                [`PUT ${PATH}`]: () => ({ status: 412, body: { error: 'stale' } }),
            });
            const { result } = await loadEditor();

            let ok = true;
            await act(async () => {
                ok = await result.current.patchSaved(setDisc);
            });

            expect(ok).toBe(false);
            expect(putCalls(api)).toHaveLength(2);
            expect(result.current.status.problem?.type).toBe('conflict');
            expect(result.current.draft?.images).toEqual({});
        });

        it('should use the ETag of the previous patch for the next one before re-render', async () => {
            let puts = 0;
            const api = mockApi({
                [`GET ${PATH}`]: () => ({ body: detail('v1', { name: '早晨' }), etag: '"v1"' }),
                [`PUT ${PATH}`]: () => {
                    puts += 1;
                    return saved(`v${puts + 1}`);
                },
            });
            const { result } = await loadEditor();
            const { patchSaved } = result.current;

            await act(async () => {
                await patchSaved(setDisc);
                await patchSaved((d) => ({ ...d, definition: { ...d.definition, host: '阿明' } }));
            });

            const [first, second] = putCalls(api);
            expect(headerOf(first?.[1], 'if-match')).toBe('"v1"');
            expect(headerOf(second?.[1], 'if-match')).toBe('"v2"');
            expect(bodyOf(second?.[1]).images).toEqual({ disc: 'd.webp' });
        });

        it('should only change the draft (no PUT) in create mode', async () => {
            const api = mockApi({});
            const initial: Draft = { definition: { name: '新節目' }, images: {} };
            const { result } = renderHook(() => useEntryEditor('shows', 'new-show', initial));

            let ok = false;
            await act(async () => {
                ok = await result.current.patchSaved(setDisc);
            });

            expect(ok).toBe(true);
            expect(api).not.toHaveBeenCalled();
            expect(result.current.draft?.images).toEqual({ disc: 'd.webp' });
        });
    });

    describe('rename succeeded but the PUT failed (AU-013)', () => {
        const ARCS = [{ id: 'drama-01-01', name: 'Season 1', episodes: 3 }];
        const RENAMED_ARCS = [{ ...ARCS[0], id: 'lancy-01' }];
        const routes = (put: () => { status?: number; body?: unknown }) => ({
            'GET /api/entries/dramas/drama-01': () => ({
                body: detail('v1', { name: '新劇', arcs: ARCS }),
                etag: '"v1"',
            }),
            'POST /api/entries/dramas/drama-01/rename': () => ({
                body: { id: 'lancy', updatedAt: 'v2' },
                etag: '"v2"',
            }),
            'PUT /api/entries/dramas/lancy': put,
        });

        const failRenameSave = async () => {
            const api = mockApi(routes(() => ({ status: 500, body: { error: 'boom' } })));
            const view = renderHook(() => useEntryEditor('dramas', 'drama-01'));
            await waitFor(() => expect(view.result.current.entry).not.toBeNull());
            act(() => view.result.current.setDefinition((d) => ({ ...d, name: '蘭茜' })));
            let saved: unknown;
            await act(async () => {
                saved = await view.result.current.run(view.result.current.draft as Draft, 'lancy');
            });
            expect(saved).toBeNull();
            return { api, view };
        };

        it('should move the saved version and the draft to the renamed entry and show the error', async () => {
            const { view } = await failRenameSave();
            const { entry, draft, status, savedId } = view.result.current;
            expect(entry).toMatchObject({ id: 'lancy', etag: '"v2"' });
            expect(entry?.definition).toEqual({ name: '新劇', arcs: RENAMED_ARCS });
            expect(draft?.definition).toEqual({ name: '蘭茜', arcs: RENAMED_ARCS });
            expect(status.problem).toEqual({ type: 'failed', message: 'boom' });
            expect(savedId()).toBe('lancy');
        });

        it('should hand the renamed entry, draft and error to the editor mounted on the new ID, once', async () => {
            const { api } = await failRenameSave();
            const moved = renderHook(() => useEntryEditor('dramas', 'lancy'));
            expect(moved.result.current.entry).toMatchObject({ id: 'lancy', etag: '"v2"' });
            expect(moved.result.current.draft?.definition).toEqual({
                name: '蘭茜',
                arcs: RENAMED_ARCS,
            });
            expect(moved.result.current.status.problem).toMatchObject({ type: 'failed' });
            // 冇重新載入（對 lancy 只有之前嗰個 PUT）
            const methods = api.mock.calls
                .filter(([path]) => path === '/api/entries/dramas/lancy')
                .map(([, init]) => init?.method);
            expect(methods).toEqual(['PUT']);

            // 暫存只用一次：之後再入嗰頁就照常由 server 載入
            const later = renderHook(() => useEntryEditor('dramas', 'lancy'));
            expect(later.result.current.entry).toBeNull();
        });

        it('should hand over once under StrictMode double-mounting too (S-1397)', async () => {
            const { api } = await failRenameSave();
            const getsOf = () =>
                api.mock.calls.filter(
                    ([path, init]) =>
                        path === '/api/entries/dramas/lancy' && (init?.method ?? 'GET') === 'GET',
                );
            const strict = { wrapper: StrictMode };
            const moved = renderHook(() => useEntryEditor('dramas', 'lancy'), strict);
            // StrictMode：state initialiser 行兩次、effect mount → cleanup → mount，接手嘅嘢唔可以唔見
            expect(moved.result.current.entry).toMatchObject({ id: 'lancy', etag: '"v2"' });
            expect(moved.result.current.draft?.definition).toEqual({
                name: '蘭茜',
                arcs: RENAMED_ARCS,
            });
            expect(moved.result.current.status.problem).toEqual({
                type: 'failed',
                message: 'boom',
            });
            expect(moved.result.current.dirtyKeys).toEqual(['name']);
            expect(getsOf()).toHaveLength(0);

            const later = renderHook(() => useEntryEditor('dramas', 'lancy'), strict);
            expect(later.result.current.entry).toBeNull();
            await waitFor(() => expect(getsOf().length).toBeGreaterThan(0));
        });
    });
});

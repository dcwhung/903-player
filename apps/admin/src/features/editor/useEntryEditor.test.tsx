import { act, renderHook, waitFor } from '@testing-library/react';
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
});

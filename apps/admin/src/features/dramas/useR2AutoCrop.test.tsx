import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { ApiError } from '../../api/client';
import { fetchR2Source, getDramaSources, uploadAsset } from '../../api/endpoints';
import type { LoadedEntry } from '../../api/types';
import { prepareImage } from '../../ui/imageCrop';
import type { Draft } from '../editor/entryDraft';
import { useR2AutoCrop } from './useR2AutoCrop';

vi.mock('../../api/endpoints', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../api/endpoints')>()),
    getDramaSources: vi.fn(),
    fetchR2Source: vi.fn(),
    uploadAsset: vi.fn(),
}));
vi.mock('../../ui/imageCrop', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../ui/imageCrop')>()),
    prepareImage: vi.fn(),
}));

const entryOf = (definition: Record<string, unknown>, images = {}): LoadedEntry => ({
    kind: 'dramas',
    id: 'lancy',
    definition,
    images,
    draft: false,
    updatedAt: 'v1',
    etag: '"v1"',
});

const R2_DRAMA = {
    name: '蘭茜',
    audio: { host: 'r2', folder: '蘭茜' },
    arcs: [{ id: 'half', name: '戀愛二分一' }],
};

const SOURCES = {
    folder: '蘭茜',
    cdCover: '蘭茜/cd cover.jpg',
    coverPhoto: null,
    arcs: [
        { name: '戀愛二分一', id: 'half', cdCover: null, coverPhoto: '蘭茜/half/cover photo.jpg' },
    ],
};

const editorOf = (entry: LoadedEntry) => {
    const saved: Draft[] = [];
    const patchSaved = vi.fn(async (apply: (d: Draft) => Draft) => {
        saved.push(apply({ definition: entry.definition, images: entry.images }));
        return true;
    });
    return { editor: { entry, patchSaved }, saved };
};

describe('useR2AutoCrop', () => {
    beforeEach(() => {
        vi.mocked(getDramaSources).mockResolvedValue(SOURCES);
        vi.mocked(fetchR2Source).mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }));
        vi.mocked(prepareImage).mockResolvedValue({
            blob: new Blob(['w'], { type: 'image/webp' }),
            source: { width: 1000, height: 1000 },
            target: { width: 600, height: 600 },
            crop: null,
        });
        let count = 0;
        vi.mocked(uploadAsset).mockImplementation(async () => ({ name: `img${++count}.webp` }));
    });

    afterEach(() => vi.clearAllMocks());

    it('should crop every empty slot that has an R2 source and save them in one PUT', async () => {
        const { editor, saved } = editorOf(entryOf(R2_DRAMA));
        const { result } = renderHook(() => useR2AutoCrop('lancy', editor));
        await waitFor(() => expect(editor.patchSaved).toHaveBeenCalledOnce());
        expect(prepareImage).toHaveBeenCalledTimes(3);
        expect(saved[0]?.definition).toMatchObject({
            disc: 'disc.webp',
            arcs: [{ id: 'half', tile: 'arcs/half/tile.webp', disc: 'arcs/half/disc.webp' }],
        });
        expect(Object.keys(saved[0]?.images ?? {})).toHaveLength(3);
        expect(result.current.statusOf()).toEqual({
            disc: { status: 'done', file: 'cd cover.jpg' },
        });
        expect(result.current.statusOf('half').tile).toEqual({
            status: 'done',
            file: 'cover photo.jpg',
        });
    });

    it('should run once under StrictMode and re-renders', async () => {
        const { editor } = editorOf(entryOf(R2_DRAMA));
        const { rerender } = renderHook(() => useR2AutoCrop('lancy', editor), {
            wrapper: StrictMode,
        });
        rerender();
        await waitFor(() => expect(editor.patchSaved).toHaveBeenCalledOnce());
        expect(getDramaSources).toHaveBeenCalledOnce();
    });

    it('should leave a slot quietly empty when R2 has no such source (404)', async () => {
        vi.mocked(fetchR2Source).mockRejectedValue(new ApiError(404, 'not found'));
        const { editor } = editorOf(entryOf(R2_DRAMA));
        const { result } = renderHook(() => useR2AutoCrop('lancy', editor));
        await waitFor(() => expect(fetchR2Source).toHaveBeenCalledTimes(3));
        await act(async () => {});
        expect(editor.patchSaved).not.toHaveBeenCalled();
        expect(result.current.statusOf()).toEqual({});
    });

    it('should show an error and keep the slot empty when the source fails otherwise', async () => {
        vi.mocked(fetchR2Source).mockRejectedValue(new ApiError(500, 'HTTP 500'));
        const { editor } = editorOf(entryOf(R2_DRAMA));
        const { result } = renderHook(() => useR2AutoCrop('lancy', editor));
        await waitFor(() =>
            expect(result.current.statusOf().disc).toEqual({
                status: 'error',
                message: 'HTTP 500',
            }),
        );
        expect(editor.patchSaved).not.toHaveBeenCalled();
    });

    it('should not touch slots that already have an image or dramas outside R2', async () => {
        const filled = entryOf(
            { ...R2_DRAMA, disc: 'disc.webp', tile: 'tile.webp', arcs: [] },
            { 'disc.webp': 'a.webp', 'tile.webp': 'b.webp' },
        );
        const { editor } = editorOf(filled);
        renderHook(() => useR2AutoCrop('lancy', editor));
        const { editor: other } = editorOf(entryOf({ name: 'x', audio: { host: 'app' } }));
        renderHook(() => useR2AutoCrop('other', other));
        await act(async () => {});
        expect(getDramaSources).not.toHaveBeenCalled();
    });

    it('should quietly skip dramas the sources endpoint refuses (422)', async () => {
        vi.mocked(getDramaSources).mockRejectedValue(new ApiError(422, 'not r2'));
        const { editor } = editorOf(entryOf(R2_DRAMA));
        const { result } = renderHook(() => useR2AutoCrop('lancy', editor));
        await waitFor(() => expect(getDramaSources).toHaveBeenCalledOnce());
        await act(async () => {});
        expect(result.current.statusOf()).toEqual({});
        expect(fetchR2Source).not.toHaveBeenCalled();
    });
});

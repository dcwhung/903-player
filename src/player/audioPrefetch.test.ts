import { AudioPrefetcher, fetchAudioBlob, type FetchAudio } from './audioPrefetch';

const URL_A = 'https://r2.dev/a.m4a';
const URL_B = 'https://r2.dev/b.m4a';

/** fetch 由測試控制幾時 resolve */
const deferredFetch = () => {
    const pending = new Map<string, (ok: boolean) => void>();
    const fetchAudio: FetchAudio = vi.fn(
        (url: string, signal: AbortSignal) =>
            new Promise<Blob>((resolve, reject) => {
                signal.addEventListener('abort', () => reject(new DOMException('', 'AbortError')));
                pending.set(url, (ok) =>
                    ok ? resolve(new Blob(['x'])) : reject(new TypeError('cors')),
                );
            }),
    );
    const settle = async (url: string, ok = true) => {
        pending.get(url)?.(ok);
        await new Promise((r) => setTimeout(r, 0));
    };
    return { fetchAudio, settle };
};

describe('AudioPrefetcher', () => {
    let created = 0;
    beforeEach(() => {
        created = 0;
        vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:${(created += 1)}`);
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    });
    afterEach(() => vi.restoreAllMocks());

    it('hands out a local blob url once the download finishes', async () => {
        const { fetchAudio, settle } = deferredFetch();
        const prefetcher = new AudioPrefetcher(fetchAudio);

        prefetcher.prefetch(URL_A);
        expect(prefetcher.take(URL_A)).toBeUndefined();
        await settle(URL_A);

        expect(prefetcher.take(URL_A)).toBe('blob:1');
    });

    it('only hands the blob out for the url it downloaded', async () => {
        const { fetchAudio, settle } = deferredFetch();
        const prefetcher = new AudioPrefetcher(fetchAudio);
        prefetcher.prefetch(URL_A);
        await settle(URL_A);

        expect(prefetcher.take(URL_B)).toBeUndefined();
    });

    it('does not download the same url twice', () => {
        const { fetchAudio } = deferredFetch();
        const prefetcher = new AudioPrefetcher(fetchAudio);

        prefetcher.prefetch(URL_A);
        prefetcher.prefetch(URL_A);

        expect(fetchAudio).toHaveBeenCalledTimes(1);
    });

    it('drops the old download when asked for another url', async () => {
        const { fetchAudio, settle } = deferredFetch();
        const prefetcher = new AudioPrefetcher(fetchAudio);
        prefetcher.prefetch(URL_A);
        await settle(URL_A);

        prefetcher.prefetch(URL_B);
        await settle(URL_B);

        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1');
        expect(prefetcher.take(URL_A)).toBeUndefined();
        expect(prefetcher.take(URL_B)).toBe('blob:2');
    });

    it('fetches a fresh cache key each time with no extra headers (no CORS preflight)', async () => {
        const fetchMock = vi.fn(async () => new Response('x'));
        vi.stubGlobal('fetch', fetchMock);
        vi.spyOn(Date, 'now').mockReturnValue(42);
        const { signal } = new AbortController();

        await fetchAudioBlob(URL_A, signal);

        expect(fetchMock).toHaveBeenCalledWith(`${URL_A}?prefetch=42`, { signal });
    });

    it('probes with no-cors after a failure to tell a CORS rejection from a network error', async () => {
        const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
            if (init?.mode === 'no-cors') return new Response(null);
            throw new TypeError('Load failed');
        });
        vi.stubGlobal('fetch', fetchMock);

        await expect(fetchAudioBlob(URL_A, new AbortController().signal)).rejects.toMatchObject({
            name: 'TypeError',
            message: 'Load failed | no-cors ok',
        });
        expect(fetchMock).toHaveBeenLastCalledWith(URL_A, { mode: 'no-cors' });
    });

    it('reports the no-cors probe failing too', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => {
                throw new TypeError('Load failed');
            }),
        );

        await expect(fetchAudioBlob(URL_A, new AbortController().signal)).rejects.toMatchObject({
            message: 'Load failed | no-cors fail TypeError: Load failed',
        });
    });

    it('reports a failed download and hands nothing out (e.g. no CORS)', async () => {
        const { fetchAudio, settle } = deferredFetch();
        const onResult = vi.fn();
        const prefetcher = new AudioPrefetcher(fetchAudio, onResult);

        prefetcher.prefetch(URL_A);
        await settle(URL_A, false);

        expect(prefetcher.take(URL_A)).toBeUndefined();
        expect(onResult).toHaveBeenCalledWith('prefetch-start', URL_A);
        expect(onResult).toHaveBeenCalledWith('prefetch-fail', URL_A, 'TypeError: cors');
    });

    it('revokes a blob that was taken once playback moves on', async () => {
        const { fetchAudio, settle } = deferredFetch();
        const prefetcher = new AudioPrefetcher(fetchAudio);
        prefetcher.prefetch(URL_A);
        await settle(URL_A);
        prefetcher.take(URL_A);

        prefetcher.take(URL_B);

        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1');
    });
});

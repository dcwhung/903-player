import type { CatalogEntry, FolderSource } from '@903-player/catalog';
import { CATALOG_FETCH_TIMEOUT_MS } from '../config/catalogFetch';
import { bundledSource as bundledDramas } from './dramas/lib/bundledSource';
import { bundledSource as bundledShows } from './shows/lib/bundledSource';

type Runtime = typeof import('./runtime');

const URL_UNDER_TEST = '/catalog/catalog.json';
const EXTRA_ID = 'remote-only';

/** 由內建資料砌一份合格 catalog.json（內建圖 URL 係 / 開頭，合規則），可以加多套劇 */
const entriesOf = (source: FolderSource): CatalogEntry[] =>
    source.folders().map(({ id, definition, images }) => ({
        id,
        definition: definition as CatalogEntry['definition'],
        images,
    }));

const remoteDocument = (extraDramas: CatalogEntry[] = []) => {
    const dramas = entriesOf(bundledDramas);
    return {
        schemaVersion: 1,
        generatedAt: '2026-11-07T10:00:00Z',
        shows: entriesOf(bundledShows),
        dramas: [...dramas, ...extraDramas],
    };
};

const extraDrama = (): CatalogEntry => {
    const lancy = entriesOf(bundledDramas).find((entry) => entry.id === 'lancy');
    if (!lancy) throw new Error('lancy missing from the bundled catalog');
    return { ...lancy, id: EXTRA_ID, definition: { ...lancy.definition, name: '遠端測試劇' } };
};

const jsonResponse = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const fetchReturning = (response: Response | Promise<Response>) =>
    vi.fn<typeof fetch>(() => Promise.resolve(response));

/** 永遠唔答，除非 signal abort（真 fetch 嘅行為） */
const hangingFetch = () =>
    vi.fn<typeof fetch>(
        (_input, init) =>
            new Promise<Response>((_resolve, reject) => {
                init?.signal?.addEventListener('abort', () =>
                    reject(new DOMException('aborted', 'AbortError')),
                );
            }),
    );

describe('catalog runtime', () => {
    let runtime: Runtime;
    let warn: ReturnType<typeof vi.spyOn>;

    beforeEach(async () => {
        vi.resetModules();
        runtime = await import('./runtime');
        warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllEnvs();
        warn.mockRestore();
    });

    describe('without initCatalog (feature off)', () => {
        it('should serve the bundled catalog without any network request', () => {
            expect(runtime.activeDramaRegistry().findDrama('golden')?.name).toBe('黃金少年');
            expect(runtime.activeShowRegistry().shows.length).toBeGreaterThan(0);
            expect(fetch).not.toHaveBeenCalled();
        });

        it('should build each registry once', () => {
            expect(runtime.activeDramaRegistry()).toBe(runtime.activeDramaRegistry());
            expect(runtime.activeShowRegistry()).toBe(runtime.activeShowRegistry());
        });
    });

    describe('initCatalog', () => {
        it('should switch to the remote catalog when it parses and builds', async () => {
            const fetchImpl = fetchReturning(jsonResponse(remoteDocument([extraDrama()])));

            await expect(runtime.initCatalog({ url: URL_UNDER_TEST, fetchImpl })).resolves.toBe(
                'remote',
            );

            expect(fetchImpl).toHaveBeenCalledWith(URL_UNDER_TEST, expect.anything());
            expect(runtime.activeDramaRegistry().findDrama(EXTRA_ID)?.name).toBe('遠端測試劇');
            expect(warn).not.toHaveBeenCalled();
        });

        it.each<[string, () => typeof fetch]>([
            ['the network fails', () => vi.fn(() => Promise.reject(new TypeError('offline')))],
            ['the server answers 404', () => fetchReturning(new Response('', { status: 404 }))],
            ['the body is not JSON', () => fetchReturning(new Response('<html>', { status: 200 }))],
            [
                'schemaVersion is unknown',
                () => fetchReturning(jsonResponse({ ...remoteDocument(), schemaVersion: 2 })),
            ],
            [
                'an entry is malformed',
                () => fetchReturning(jsonResponse({ ...remoteDocument(), shows: [{ id: 'x' }] })),
            ],
            [
                'a definition names an image missing from the manifest',
                () => {
                    const broken = { ...extraDrama(), images: {} };
                    return fetchReturning(jsonResponse(remoteDocument([broken])));
                },
            ],
            [
                'a definition fails the drama schema',
                () => {
                    const broken = { ...extraDrama(), definition: { name: '冇 kind' } };
                    return fetchReturning(jsonResponse(remoteDocument([broken])));
                },
            ],
        ])('should fall back to the bundled catalog with a warning when %s', async (_l, make) => {
            await expect(
                runtime.initCatalog({ url: URL_UNDER_TEST, fetchImpl: make() }),
            ).resolves.toBe('bundled');

            expect(runtime.activeDramaRegistry().findDrama(EXTRA_ID)).toBeUndefined();
            expect(runtime.activeDramaRegistry().findDrama('golden')).toBeDefined();
            expect(warn).toHaveBeenCalledWith(
                expect.stringContaining('[catalog]'),
                expect.anything(),
            );
        });

        it('should give up after CATALOG_FETCH_TIMEOUT_MS and abort the request', async () => {
            vi.useFakeTimers();
            const fetchImpl = hangingFetch();
            let settled = false;
            const pending = runtime
                .initCatalog({ url: URL_UNDER_TEST, fetchImpl })
                .finally(() => (settled = true));

            await vi.advanceTimersByTimeAsync(CATALOG_FETCH_TIMEOUT_MS - 1);
            expect(settled).toBe(false);
            await vi.advanceTimersByTimeAsync(1);

            await expect(pending).resolves.toBe('bundled');
            expect(fetchImpl.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
        });

        it('should time out even when fetch ignores the abort signal', async () => {
            vi.useFakeTimers();
            const fetchImpl = vi.fn<typeof fetch>(() => new Promise<Response>(() => undefined));
            const pending = runtime.initCatalog({ url: URL_UNDER_TEST, fetchImpl, timeoutMs: 10 });

            await vi.advanceTimersByTimeAsync(10);

            await expect(pending).resolves.toBe('bundled');
        });

        it('should time out while the body is still downloading', async () => {
            vi.useFakeTimers();
            const slowBody = { ok: true, json: () => new Promise(() => undefined) } as Response;
            const pending = runtime.initCatalog({
                url: URL_UNDER_TEST,
                fetchImpl: fetchReturning(slowBody),
                timeoutMs: 10,
            });

            await vi.advanceTimersByTimeAsync(10);

            await expect(pending).resolves.toBe('bundled');
        });

        it('should keep the bundled catalog when a registry was read while fetching', async () => {
            let answer: (response: Response) => void = () => undefined;
            const fetchImpl = vi.fn<typeof fetch>(() => new Promise((r) => (answer = r)));
            const pending = runtime.initCatalog({ url: URL_UNDER_TEST, fetchImpl });

            runtime.activeShowRegistry();
            answer(jsonResponse(remoteDocument([extraDrama()])));

            await expect(pending).resolves.toBe('bundled');
            expect(runtime.activeDramaRegistry().findDrama(EXTRA_ID)).toBeUndefined();
        });
    });

    describe('activeBanner (Phase 4 L3)', () => {
        const BANNER = {
            standard: 'https://api.example/catalog/v1/img/0123456789abcdef.webp',
            long: '/catalog/v1/img/fedcba9876543210.webp',
        };

        it('should have no banner without initCatalog (built-in images)', () => {
            expect(runtime.activeBanner()).toBeUndefined();
        });

        it('should serve the remote catalog banner', async () => {
            const fetchImpl = fetchReturning(jsonResponse({ ...remoteDocument(), banner: BANNER }));
            await runtime.initCatalog({ url: URL_UNDER_TEST, fetchImpl });
            expect(runtime.activeBanner()).toEqual(BANNER);
        });

        it('should have no banner when the remote catalog has none', async () => {
            await runtime.initCatalog({
                url: URL_UNDER_TEST,
                fetchImpl: fetchReturning(jsonResponse(remoteDocument())),
            });
            expect(runtime.activeBanner()).toBeUndefined();
        });

        it('should reject a remote catalog whose banner is malformed, falling back', async () => {
            const broken = { ...remoteDocument(), banner: { standard: BANNER.standard } };
            await expect(
                runtime.initCatalog({
                    url: URL_UNDER_TEST,
                    fetchImpl: fetchReturning(jsonResponse(broken)),
                }),
            ).resolves.toBe('bundled');
            expect(runtime.activeBanner()).toBeUndefined();
        });

        it('should count as a read, so a later initCatalog is rejected', async () => {
            runtime.activeBanner();
            await expect(
                runtime.initCatalog({
                    url: URL_UNDER_TEST,
                    fetchImpl: fetchReturning(jsonResponse(remoteDocument())),
                }),
            ).rejects.toThrow(/before any registry/);
        });

        describe('with a prebuild snapshot', () => {
            const SNAPSHOT_BANNER = { standard: '/assets/s.webp', long: '/assets/l.webp' };

            beforeEach(async () => {
                vi.resetModules();
                vi.doMock('./snapshot/source', async (importOriginal) => ({
                    ...(await importOriginal<typeof import('./snapshot/source')>()),
                    snapshotDocument: { ...remoteDocument(), banner: SNAPSHOT_BANNER },
                }));
                runtime = await import('./runtime');
            });

            afterEach(() => {
                vi.doUnmock('./snapshot/source');
            });

            it('should fall back to the snapshot banner when the remote catalog fails', async () => {
                await runtime.initCatalog({
                    url: URL_UNDER_TEST,
                    fetchImpl: fetchReturning(new Response('', { status: 404 })),
                });
                expect(runtime.activeBanner()).toEqual(SNAPSHOT_BANNER);
            });

            it('should use the snapshot banner without initCatalog', () => {
                expect(runtime.activeBanner()).toEqual(SNAPSHOT_BANNER);
            });

            it('should prefer the remote banner over the snapshot', async () => {
                const doc = { ...remoteDocument(), banner: BANNER };
                await runtime.initCatalog({
                    url: URL_UNDER_TEST,
                    fetchImpl: fetchReturning(jsonResponse(doc)),
                });
                expect(runtime.activeBanner()).toEqual(BANNER);
            });
        });
    });

    describe('one source per session', () => {
        const ok = () => fetchReturning(jsonResponse(remoteDocument()));

        it('should throw in dev when initCatalog runs twice', async () => {
            await runtime.initCatalog({ url: URL_UNDER_TEST, fetchImpl: ok() });

            await expect(
                runtime.initCatalog({ url: URL_UNDER_TEST, fetchImpl: ok() }),
            ).rejects.toThrow(/once/);
        });

        it('should throw in dev when initCatalog runs after a registry was read', async () => {
            runtime.activeDramaRegistry();

            await expect(
                runtime.initCatalog({ url: URL_UNDER_TEST, fetchImpl: ok() }),
            ).rejects.toThrow(/before/);
        });

        it('should warn and keep the current source in production', async () => {
            vi.stubEnv('DEV', false);
            runtime.activeDramaRegistry();
            const fetchImpl = ok();

            await expect(runtime.initCatalog({ url: URL_UNDER_TEST, fetchImpl })).resolves.toBe(
                'bundled',
            );

            expect(fetchImpl).not.toHaveBeenCalled();
            expect(warn).toHaveBeenCalled();
        });
    });
});

import type { CatalogEntry, FolderSource } from '@903-player/catalog';
import { bundledSource as bundledDramas } from '../catalog/dramas/lib/bundledSource';
import { bundledSource as bundledShows } from '../catalog/shows/lib/bundledSource';
import { PROBE_STORAGE_KEY } from './probeStore';

/*
 * AU-027：admin 喺 player build 之後加嘅節目（淨係 remote catalog.json 有）。
 * 某次開 app 攞唔到 catalog.json、退去內建資料：嗰個節目搵到嘅錄音唔可以畀人由 storage 刪走
 */

type Session = {
    probe: typeof import('./audioProbe');
    store: typeof import('./probeStore');
};

const CATALOG_URL = '/catalog/catalog.json';
const REMOTE_ONLY_ID = 'remote-only-show';
const REMOTE_ONLY_NAME = '遠端測試節目';
const ORIGIN = 'https://audio.hkfm903.live';
/** 2026-10-20（二）12:00 香港時間 */
const NOW = new Date('2026-10-20T04:00:00Z');
/** 回看期（14 日）以外：再 probe 都攞唔返 */
const OLD_DATE = '2026-09-01';
const RECENT_DATE = '2026-10-19';

const entriesOf = (source: FolderSource): CatalogEntry[] =>
    source.folders().map(({ id, definition, images }) => ({
        id,
        definition: definition as CatalogEntry['definition'],
        images,
    }));

const remoteOnlyShow = (): CatalogEntry => {
    const base = entriesOf(bundledShows).find((entry) => entry.id === 'badgirl');
    if (!base) throw new Error('badgirl missing from the bundled catalog');
    return {
        ...base,
        id: REMOTE_ONLY_ID,
        definition: { ...base.definition, name: REMOTE_ONLY_NAME },
    };
};

const remoteDocument = (extraShows: CatalogEntry[]) => ({
    schemaVersion: 1,
    generatedAt: '2026-11-07T10:00:00Z',
    shows: [...entriesOf(bundledShows), ...extraShows],
    dramas: entriesOf(bundledDramas),
});

const respondWith = (body: unknown) =>
    vi.fn<typeof fetch>(() =>
        Promise.resolve(
            new Response(JSON.stringify(body), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }),
        ),
    );
const failingFetch = () => vi.fn<typeof fetch>(() => Promise.reject(new Error('offline')));

/** 新一次開 app：module 全部重新載入，catalog 重新揀 */
const openSession = async (fetchImpl?: typeof fetch): Promise<Session> => {
    vi.resetModules();
    if (fetchImpl) {
        const { initCatalog } = await import('../catalog/runtime');
        await initCatalog({ url: CATALOG_URL, fetchImpl });
    }
    return { probe: await import('./audioProbe'), store: await import('./probeStore') };
};
const openRemoteSession = (extraShows: CatalogEntry[] = [remoteOnlyShow()]) =>
    openSession(respondWith(remoteDocument(extraShows)));
const openFallbackSession = () => openSession(failingFetch());

const stored = (showId: string, date: string, url = `${ORIGIN}/x/${date}.aac`) => ({
    showId,
    date,
    time: '1009',
    url,
});
const REMOTE_ONLY_RECORDINGS = [
    stored(REMOTE_ONLY_ID, OLD_DATE),
    stored(REMOTE_ONLY_ID, RECENT_DATE),
];
const BADGIRL_RECORDING = stored('badgirl', RECENT_DATE);

const seed = (found: unknown[], misses: Record<string, number> = {}): void =>
    localStorage.setItem(PROBE_STORAGE_KEY, JSON.stringify({ found, misses }));

const storedFound = (): { showId: string; date: string; url: string }[] =>
    (
        JSON.parse(localStorage.getItem(PROBE_STORAGE_KEY) ?? '{}') as {
            found?: { showId: string; date: string; url: string }[];
        }
    ).found ?? [];
const storedDatesOf = (showId: string): string[] =>
    storedFound()
        .filter((r) => r.showId === showId)
        .map((r) => r.date)
        .sort();

/** read → probe → write 成條路行一次；原站乜都搵唔到 */
const runProbe = ({ probe }: Session) =>
    probe.probeRecentRecordings({ probe: () => Promise.resolve('missing'), now: NOW });

describe('probe store when the session falls back to the bundled catalog', () => {
    let warn: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        localStorage.clear();
        warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        seed([...REMOTE_ONLY_RECORDINGS, BADGIRL_RECORDING]);
    });
    afterEach(() => warn.mockRestore());

    it('should keep the recordings of a remote-only show in storage', async () => {
        const session = await openFallbackSession();
        await runProbe(session);
        expect(storedDatesOf(REMOTE_ONLY_ID)).toEqual([OLD_DATE, RECENT_DATE]);
        expect(storedDatesOf('badgirl')).toContain(RECENT_DATE);
    });

    it('should keep them when a newly found recording is written', async () => {
        const session = await openFallbackSession();
        await session.probe.probeRecentRecordings({
            probe: () => Promise.resolve('found'),
            now: NOW,
        });
        expect(storedDatesOf(REMOTE_ONLY_ID)).toEqual([OLD_DATE, RECENT_DATE]);
        expect(storedDatesOf('badgirl').length).toBeGreaterThan(1);
    });

    it('should not store them twice when the state is written repeatedly', async () => {
        const session = await openFallbackSession();
        await runProbe(session);
        await runProbe(session);
        expect(storedDatesOf(REMOTE_ONLY_ID)).toEqual([OLD_DATE, RECENT_DATE]);
    });

    it('should not expose them to any reader in that session', async () => {
        const session = await openFallbackSession();
        const probed = await runProbe(session);
        const readers = [
            probed,
            session.probe.readStoredRecordings(),
            session.store.readProbeState().found,
        ];
        readers.forEach((found) => {
            expect(found.map((r) => r.showId)).not.toContain(REMOTE_ONLY_ID);
            expect(found.map((r) => r.showId)).toContain('badgirl');
        });
        expect(
            session.probe.readUnavailableEpisodes(NOW).map((episode) => episode.showId),
        ).not.toContain(REMOTE_ONLY_ID);
    });

    it('should show them again once a later session knows the show', async () => {
        await runProbe(await openFallbackSession());
        const { probe } = await openRemoteSession();
        const dates = probe
            .readStoredRecordings()
            .filter((r) => r.showId === REMOTE_ONLY_ID)
            .map((r) => r.date);
        expect(dates.sort()).toEqual([OLD_DATE, RECENT_DATE]);
    });

    it('should still drop malformed or foreign-origin entries of an unknown show', async () => {
        seed([
            ...REMOTE_ONLY_RECORDINGS,
            stored(REMOTE_ONLY_ID, '2026-09-02', 'https://evil.example/x.aac'),
            stored(REMOTE_ONLY_ID, 'not-a-date'),
            { ...stored(REMOTE_ONLY_ID, '2026-09-03'), time: '9999' },
            { ...stored(REMOTE_ONLY_ID, '2026-09-04'), showId: 42 },
            'garbage',
        ]);
        await runProbe(await openFallbackSession());
        expect(storedFound().map((r) => r.date)).toEqual([OLD_DATE, RECENT_DATE]);
        expect(storedFound().every((r) => r.url.startsWith(ORIGIN))).toBe(true);
    });
});

// S-1422：讀唔返舊 storage（壞 JSON / 讀取 throw）就冇得保留，但今次嘅結果照寫得入
describe('probe store write when the stored state cannot be read back', () => {
    let warn: ReturnType<typeof vi.spyOn>;
    const KNOWN = { ...BADGIRL_RECORDING, id: `show:badgirl:${RECENT_DATE}` };
    const MISSES = { [`badgirl:${OLD_DATE}`]: 1 };

    beforeEach(() => {
        localStorage.clear();
        warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });
    afterEach(() => {
        vi.restoreAllMocks();
        warn.mockRestore();
    });

    it('should still write the new state over corrupt JSON, without any carry-over', async () => {
        const { store } = await openFallbackSession();
        localStorage.setItem(PROBE_STORAGE_KEY, '{not json');

        store.writeProbeState({ found: [KNOWN], misses: MISSES });

        expect(JSON.parse(localStorage.getItem(PROBE_STORAGE_KEY) ?? 'null')).toEqual({
            found: [KNOWN],
            misses: MISSES,
        });
    });

    it('should still write the new state when reading storage throws', async () => {
        const { store } = await openFallbackSession();
        seed(REMOTE_ONLY_RECORDINGS);
        const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new DOMException('denied', 'SecurityError');
        });

        store.writeProbeState({ found: [KNOWN], misses: MISSES });
        getItem.mockRestore();

        expect(JSON.parse(localStorage.getItem(PROBE_STORAGE_KEY) ?? 'null')).toEqual({
            found: [KNOWN],
            misses: MISSES,
        });
    });

    it('should carry nothing over when the stored found list is not an array', async () => {
        const { store } = await openFallbackSession();
        localStorage.setItem(PROBE_STORAGE_KEY, JSON.stringify({ found: 'oops', misses: {} }));

        store.writeProbeState({ found: [KNOWN], misses: {} });

        expect(storedFound()).toEqual([KNOWN]);
    });
});

describe('probe store when the session catalog is complete', () => {
    let warn: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        localStorage.clear();
        warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        seed([...REMOTE_ONLY_RECORDINGS, BADGIRL_RECORDING]);
    });
    afterEach(() => warn.mockRestore());

    it('should drop the recordings of a show the remote catalog no longer has', async () => {
        await runProbe(await openRemoteSession([]));
        expect(storedDatesOf(REMOTE_ONLY_ID)).toEqual([]);
        expect(storedDatesOf('badgirl')).toContain(RECENT_DATE);
    });

    it('should keep the recordings of a show the remote catalog has', async () => {
        await runProbe(await openRemoteSession());
        expect(storedDatesOf(REMOTE_ONLY_ID)).toEqual([OLD_DATE, RECENT_DATE]);
    });

    it('should drop unknown-show recordings when no remote catalog is configured', async () => {
        await runProbe(await openSession());
        expect(storedDatesOf(REMOTE_ONLY_ID)).toEqual([]);
        expect(storedDatesOf('badgirl')).toContain(RECENT_DATE);
    });
});

import { FakeAudio } from '../../tests/fakeAudio';
import { ALLOWED_AUDIO_ORIGIN } from '../config/constants';
import { findShow } from '../config/shows';
import type { Recording } from '../types/recording';
import {
    PROBE_FOUND_RETENTION_DAYS,
    PROBE_RETRY_MS,
    PROBE_TIMEOUT_MS,
    buildAudioUrl,
    probeAudio,
    probeRecentRecordings,
    readCachedRecordings,
    type AudioProber,
    type ProbeResult,
} from './audioProbe';
import {
    PROBE_STORAGE_KEY,
    dateFromShowDateKey,
    readProbeState,
    writeProbeState,
} from './probeStore';

/** 用戶喺原站複製出嚟嘅真實網址 */
const REAL_URLS = {
    badgirl:
        'https://audio.hkfm903.live/Bad%20Girl%E5%A4%A7%E9%81%8E%E4%BD%AC/20261019_1009_Bad_Girl%E5%A4%A7%E9%81%8E%E4%BD%AC.aac',
    gongzi: 'https://audio.hkfm903.live/%E5%85%AC%E5%AD%90%E6%9C%83/20261017_2308_%E5%85%AC%E5%AD%90%E6%9C%83.aac',
    sunnyday:
        'https://audio.hkfm903.live/%E5%9C%A8%E6%99%B4%E6%9C%97%E7%9A%84%E4%B8%80%E5%A4%A9%E5%87%BA%E7%99%BC/20261019_0809_%E5%9C%A8%E6%99%B4%E6%9C%97%E7%9A%84%E4%B8%80%E5%A4%A9%E5%87%BA%E7%99%BC.aac',
    westair:
        'https://audio.hkfm903.live/%E8%A5%BF%E5%8A%A0%E8%88%AA%E7%A9%BA/20261017_0905_%E8%A5%BF%E5%8A%A0%E8%88%AA%E7%A9%BA.aac',
    wanni: 'https://audio.hkfm903.live/%E9%9B%B2%E5%A6%AE%E9%8D%BE%E6%83%85/20261019_0708_%E9%9B%B2%E5%A6%AE%E9%8D%BE%E6%83%85.aac',
} as const;

/** 2026-10-20 12:00 香港時間 */
const NOW = new Date('2026-10-20T04:00:00Z');

describe('buildAudioUrl', () => {
    it.each([
        ['badgirl', '2026-10-19'],
        ['gongzi', '2026-10-17'],
        ['sunnyday', '2026-10-19'],
        ['westair', '2026-10-17'],
        ['wanni', '2026-10-19'],
    ] as const)('matches the real %s url', (showId, date) => {
        expect(buildAudioUrl(findShow(showId)!, date)).toBe(REAL_URLS[showId]);
    });
});

describe('probeAudio', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const start = (): { audio: FakeAudio; result: Promise<ProbeResult> } => {
        const audio = new FakeAudio();
        const result = probeAudio(REAL_URLS.gongzi, () => audio.asAudio());
        return { audio, result };
    };

    it('only asks for metadata', () => {
        const { audio } = start();

        expect(audio.preload).toBe('metadata');
        expect(audio.src).toBe(REAL_URLS.gongzi);
    });

    it('resolves found once metadata loads, then releases the source', async () => {
        const { audio, result } = start();

        audio.emitMetadata(3600);

        await expect(result).resolves.toBe('found');
        expect(audio.src).toBe('');
        expect(audio.load).toHaveBeenCalled();
    });

    it('resolves missing when the file errors, then releases the source', async () => {
        const { audio, result } = start();

        audio.dispatchEvent(new Event('error'));

        await expect(result).resolves.toBe('missing');
        expect(audio.src).toBe('');
        expect(audio.load).toHaveBeenCalled();
    });

    it('resolves timeout (not missing) when nothing happens, then releases the source', async () => {
        const { audio, result } = start();

        await vi.advanceTimersByTimeAsync(PROBE_TIMEOUT_MS);

        await expect(result).resolves.toBe('timeout');
        expect(audio.src).toBe('');
        expect(audio.load).toHaveBeenCalled();
    });

    it('ignores events fired after it has finished', async () => {
        const { audio, result } = start();

        audio.dispatchEvent(new Event('error'));
        audio.emitMetadata(3600);
        await vi.advanceTimersByTimeAsync(PROBE_TIMEOUT_MS);

        await expect(result).resolves.toBe('missing');
    });

    it('ignores metadata arriving after the timeout', async () => {
        const { audio, result } = start();

        await vi.advanceTimersByTimeAsync(PROBE_TIMEOUT_MS);
        audio.emitMetadata(3600);

        await expect(result).resolves.toBe('timeout');
    });
});

describe('probeRecentRecordings', () => {
    beforeEach(() => localStorage.clear());

    const found = (urls: string[]): AudioProber =>
        vi.fn(async (url: string): Promise<ProbeResult> =>
            urls.includes(url) ? 'found' : 'missing',
        );

    it('stops probing and records no miss when the platform times out', async () => {
        const timingOut = vi.fn(async (): Promise<ProbeResult> => 'timeout');

        const result = await probeRecentRecordings([], { probe: timingOut, now: NOW });

        expect(timingOut).toHaveBeenCalledTimes(1);
        expect(result).toEqual([]);
        expect(readProbeState().misses).toEqual({});
    });

    it('retries right away on the next run after a timeout', async () => {
        await probeRecentRecordings([], {
            probe: async (): Promise<ProbeResult> => 'timeout',
            now: NOW,
        });
        const next = found([]);

        await probeRecentRecordings([], { probe: next, now: new Date(NOW.getTime() + 1) });

        expect(next).toHaveBeenCalledTimes(9);
    });

    it('probes today and yesterday for every show and returns what exists', async () => {
        const probe = found([REAL_URLS.badgirl]);

        const result = await probeRecentRecordings([], { probe, now: NOW });

        // 今日 12:00：公子會（23:08）未播，所以係 4 + 5
        expect(probe).toHaveBeenCalledTimes(9);
        expect(result).toEqual<Recording[]>([
            { showId: 'badgirl', date: '2026-10-19', time: '1009', url: REAL_URLS.badgirl },
        ]);
    });

    it("skips today's shows that have not aired yet", async () => {
        const probe = found([]);

        await probeRecentRecordings([], { probe, now: NOW });

        const urls = vi.mocked(probe).mock.calls.map(([url]) => url);
        expect(urls).not.toContain(buildAudioUrl(findShow('gongzi')!, '2026-10-20'));
        expect(urls).toContain(buildAudioUrl(findShow('gongzi')!, '2026-10-19'));
        expect(urls).toContain(buildAudioUrl(findShow('badgirl')!, '2026-10-20'));
    });

    it('skips shows the feed already has for that date', async () => {
        const probe = found([]);
        const known: Recording = {
            showId: 'badgirl',
            date: '2026-10-19',
            time: '1009',
            url: REAL_URLS.badgirl,
        };

        await probeRecentRecordings([known], { probe, now: NOW });

        expect(probe).toHaveBeenCalledTimes(8);
        expect(probe).not.toHaveBeenCalledWith(REAL_URLS.badgirl);
    });

    it('remembers found files and never probes them again', async () => {
        await probeRecentRecordings([], { probe: found([REAL_URLS.badgirl]), now: NOW });
        const again = found([]);

        const result = await probeRecentRecordings([], { probe: again, now: NOW });

        expect(again).not.toHaveBeenCalledWith(REAL_URLS.badgirl);
        expect(result.map((r) => r.url)).toEqual([REAL_URLS.badgirl]);
    });

    describe('pruning remembered recordings', () => {
        const remembered: Recording = {
            showId: 'badgirl',
            date: '2026-10-19',
            time: '1009',
            url: REAL_URLS.badgirl,
        };
        const remember = (recording: Recording): void =>
            writeProbeState({ found: [recording], misses: {} });

        it('drops a found recording once the feed covers the same show and date', async () => {
            remember(remembered);
            const feedVersion: Recording = {
                ...remembered,
                time: '1010',
                url: `${ALLOWED_AUDIO_ORIGIN}/x.aac`,
            };

            const result = await probeRecentRecordings([feedVersion], {
                probe: found([]),
                now: NOW,
            });

            expect(result).toEqual([]);
            expect(readProbeState().found).toEqual([]);
        });

        it('drops a found recording when the feed has the same url in another encoding', async () => {
            remember(remembered);
            const unencoded = decodeURI(REAL_URLS.badgirl);
            const feedVersion: Recording = { ...remembered, date: '2026-10-12', url: unencoded };

            const result = await probeRecentRecordings([feedVersion], {
                probe: found([]),
                now: NOW,
            });

            expect(result).toEqual([]);
        });

        it(`drops found recordings older than ${PROBE_FOUND_RETENTION_DAYS} days`, async () => {
            const kept: Recording = { ...remembered, showId: 'westair', date: '2026-10-06' };
            writeProbeState({ found: [{ ...remembered, date: '2026-10-05' }, kept], misses: {} });

            const result = await probeRecentRecordings([], { probe: found([]), now: NOW });

            expect(result).toEqual([kept]);
        });
    });

    describe('Hong Kong / UTC day boundary', () => {
        const probedDates = (probe: AudioProber): Set<string> =>
            new Set(
                vi
                    .mocked(probe)
                    .mock.calls.map(
                        ([url]) => /\/(\d{8})_/.exec(decodeURIComponent(url))?.[1] ?? '',
                    ),
            );
        const seedMisses = (): void =>
            writeProbeState({
                found: [],
                misses: {
                    'gongzi:2026-10-18': 0,
                    'gongzi:2026-10-19': 0,
                    'gongzi:2026-10-20': 0,
                },
            });
        const keptMissDates = (): Set<string> =>
            new Set(Object.keys(readProbeState().misses).map(dateFromShowDateKey));

        it('treats UTC 16:30 (HK 00:30) as the next HK day', async () => {
            seedMisses();
            const probe = found([]);

            await probeRecentRecordings([], { probe, now: new Date('2026-10-19T16:30:00Z') });

            // 00:30 未有節目開咪，所以今日（20 號）冇嘢 probe，只係 probe 尋日（19 號）
            expect(probedDates(probe)).toEqual(new Set(['20261019']));
            expect(keptMissDates()).toEqual(new Set(['2026-10-19', '2026-10-20']));
        });

        it('treats UTC 15:59 (HK 23:59) as still the same HK day', async () => {
            seedMisses();
            const probe = found([]);

            await probeRecentRecordings([], { probe, now: new Date('2026-10-19T15:59:00Z') });

            expect(probedDates(probe)).toEqual(new Set(['20261019', '20261018']));
            expect(keptMissDates()).toEqual(new Set(['2026-10-18', '2026-10-19']));
        });
    });

    it('waits PROBE_RETRY_MS before probing a missing file again', async () => {
        await probeRecentRecordings([], { probe: found([]), now: NOW });
        const soon = found([]);
        const later = found([]);

        await probeRecentRecordings([], { probe: soon, now: new Date(NOW.getTime() + 1) });
        await probeRecentRecordings([], {
            probe: later,
            now: new Date(NOW.getTime() + PROBE_RETRY_MS),
        });

        expect(soon).not.toHaveBeenCalled();
        expect(later).toHaveBeenCalledTimes(9);
    });

    it('drops misses from older days so storage does not grow', async () => {
        await probeRecentRecordings([], { probe: found([]), now: NOW });
        const twoDaysLater = new Date(NOW.getTime() + 2 * 24 * 60 * 60 * 1000);

        await probeRecentRecordings([], { probe: found([]), now: twoDaysLater });

        const dates = Object.keys(readProbeState().misses).map(dateFromShowDateKey);
        expect(new Set(dates)).toEqual(new Set(['2026-10-21', '2026-10-22']));
    });

    it('still returns results when storage is unavailable', async () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('full', 'QuotaExceededError');
        });

        const result = await probeRecentRecordings([], {
            probe: found([REAL_URLS.badgirl]),
            now: NOW,
        });

        expect(result).toHaveLength(1);
        vi.restoreAllMocks();
    });

    it('ignores corrupted storage', async () => {
        localStorage.setItem(PROBE_STORAGE_KEY, '{not json');

        await expect(probeRecentRecordings([], { probe: found([]), now: NOW })).resolves.toEqual(
            [],
        );
    });
});

describe('readCachedRecordings', () => {
    beforeEach(() => localStorage.clear());

    const remembered: Recording = {
        showId: 'badgirl',
        date: '2026-10-19',
        time: '1009',
        url: REAL_URLS.badgirl,
    };

    it('returns remembered recordings synchronously without probing', () => {
        writeProbeState({ found: [remembered], misses: {} });

        expect(readCachedRecordings([], NOW)).toEqual([remembered]);
    });

    it('leaves out what the feed already covers', () => {
        writeProbeState({ found: [remembered], misses: {} });

        expect(readCachedRecordings([remembered], NOW)).toEqual([]);
    });

    it('returns nothing when storage is empty', () => {
        expect(readCachedRecordings([], NOW)).toEqual([]);
    });
});

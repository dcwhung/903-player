import { FakeAudio } from '../../tests/fakeAudio';
import { findShow, SHOWS } from '../shows';
import type { Recording } from '../types/recording';
import {
    PROBE_KEEP_PER_SHOW,
    PROBE_LOOKBACK_DAYS,
    PROBE_RETRY_MS,
    PROBE_SETTLED_RETRY_MS,
    PROBE_TIMEOUT_MS,
    buildAudioUrl,
    probeAudio,
    probeRecentRecordings,
    readStoredRecordings,
    readUnavailableEpisodes,
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
    waves: 'https://audio.hkfm903.live/%E5%8F%A3%E6%B0%B4%E5%A4%9A%E9%81%8E%E6%B5%AA%E8%8A%B1/20261020_1510_%E5%8F%A3%E6%B0%B4%E5%A4%9A%E9%81%8E%E6%B5%AA%E8%8A%B1.aac',
    lalala: 'https://audio.hkfm903.live/%E8%81%96%E8%89%BE%E7%B2%92LaLaLaLa/20261020_1710_%E8%81%96%E8%89%BE%E7%B2%92LaLaLaLa.aac',
    wanni: 'https://audio.hkfm903.live/%E9%9B%B2%E5%A6%AE%E9%8D%BE%E6%83%85/20261019_0708_%E9%9B%B2%E5%A6%AE%E9%8D%BE%E6%83%85.aac',
} as const;

/** 2026-10-20（二）12:00 香港時間 */
const NOW = new Date('2026-10-20T04:00:00Z');
/**
 * NOW 回看 14 日（7–20 號）入面要 probe 嘅節目：
 * 一至五共 10 日各 5 個，但今日（20 號）口水多過浪花（15:10）同聖艾粒（17:10）未開咪；
 * 六（10、17 號）各有公子會同西加；日冇節目
 */
const WINDOW_SLOTS = 52;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;
/** MediaError 嘅 code（jsdom 冇 MediaError，所以自己寫低） */
const MEDIA_ERR_NETWORK_CODE = 2;
const MEDIA_ERR_SRC_NOT_SUPPORTED_CODE = 4;
const daysAfter = (date: Date, days: number): Date => new Date(date.getTime() + days * MS_PER_DAY);
const urlFor = (showId: Parameters<typeof findShow>[0], date: string): string =>
    buildAudioUrl(findShow(showId)!, date);

describe('buildAudioUrl', () => {
    it.each([
        ['badgirl', '2026-10-19'],
        ['gongzi', '2026-10-17'],
        ['sunnyday', '2026-10-19'],
        ['westair', '2026-10-17'],
        ['wanni', '2026-10-19'],
        ['waves', '2026-10-20'],
        ['lalala', '2026-10-20'],
    ] as const)('matches the real %s url', (showId, date) => {
        expect(buildAudioUrl(findShow(showId)!, date)).toBe(REAL_URLS[showId]);
    });
});

describe('probe constants', () => {
    it('keeps enough recordings per show to cover the whole lookback window', () => {
        // 播得最密嘅節目喺回看期內最多有幾多集；保留少過呢個數，仲喺期內嘅錄音會先被清走、
        // 再被當成未搵過重新 probe，白白多咗請求，列表亦會忽然少咗嗰幾集
        const weeks = Math.ceil(PROBE_LOOKBACK_DAYS / DAYS_PER_WEEK);
        const busiest = Math.max(...SHOWS.map((show) => show.airDays.length * weeks));

        expect(PROBE_KEEP_PER_SHOW).toBeGreaterThanOrEqual(busiest);
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

    it('resolves timeout (not missing) on a network error after data started arriving', async () => {
        const { audio, result } = start();

        audio.error = { code: MEDIA_ERR_NETWORK_CODE };
        audio.dispatchEvent(new Event('error'));

        await expect(result).resolves.toBe('timeout');
        expect(audio.src).toBe('');
    });

    it('still resolves missing for a non-network media error', async () => {
        const { audio, result } = start();

        audio.error = { code: MEDIA_ERR_SRC_NOT_SUPPORTED_CODE };
        audio.dispatchEvent(new Event('error'));

        await expect(result).resolves.toBe('missing');
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

        const result = await probeRecentRecordings({ probe: timingOut, now: NOW });

        expect(timingOut).toHaveBeenCalledTimes(1);
        expect(result).toEqual([]);
        expect(readProbeState().misses).toEqual({});
    });

    it('neither probes nor records misses while offline, but still returns cached finds', async () => {
        const remembered: Recording = {
            showId: 'badgirl',
            date: '2026-10-19',
            time: '1009',
            url: REAL_URLS.badgirl,
        };
        writeProbeState({ found: [remembered], misses: {} });
        const probe = found([]);

        const result = await probeRecentRecordings({ probe, now: NOW, isOnline: () => false });

        expect(probe).not.toHaveBeenCalled();
        expect(result).toEqual([remembered]);
        expect(readProbeState().misses).toEqual({});
    });

    it('stops without recording a miss when the network drops mid-run', async () => {
        let online = true;
        let calls = 0;
        const probe = vi.fn(async (): Promise<ProbeResult> => {
            calls += 1;
            if (calls === 2) {
                // 第 2 個 probe 途中斷網：瀏覽器照樣報 error（code 4），睇落同冇檔一樣
                online = false;
            }
            return 'missing';
        });

        await probeRecentRecordings({ probe, now: NOW, isOnline: () => online });

        expect(probe).toHaveBeenCalledTimes(2);
        expect(Object.keys(readProbeState().misses)).toHaveLength(1);
    });

    it('probes as usual when online', async () => {
        const probe = found([]);

        await probeRecentRecordings({ probe, now: NOW, isOnline: () => true });

        expect(probe).toHaveBeenCalledTimes(WINDOW_SLOTS);
    });

    it('retries right away on the next run after a timeout', async () => {
        await probeRecentRecordings({
            probe: async (): Promise<ProbeResult> => 'timeout',
            now: NOW,
        });
        const next = found([]);

        await probeRecentRecordings({ probe: next, now: new Date(NOW.getTime() + 1) });

        expect(next).toHaveBeenCalledTimes(WINDOW_SLOTS);
    });

    it(`probes each show's broadcast days in the last ${PROBE_LOOKBACK_DAYS} days`, async () => {
        const probe = found([REAL_URLS.badgirl]);

        const result = await probeRecentRecordings({ probe, now: NOW });

        expect(probe).toHaveBeenCalledTimes(WINDOW_SLOTS);
        expect(result).toEqual<Recording[]>([
            { showId: 'badgirl', date: '2026-10-19', time: '1009', url: REAL_URLS.badgirl },
        ]);
    });

    it('only probes a show on the weekdays it airs', async () => {
        const probe = found([]);

        await probeRecentRecordings({ probe, now: NOW });

        const urls = vi.mocked(probe).mock.calls.map(([url]) => url);
        expect(urls).toContain(urlFor('gongzi', '2026-10-17'));
        expect(urls).not.toContain(urlFor('gongzi', '2026-10-19'));
        expect(urls).not.toContain(urlFor('badgirl', '2026-10-17'));
        expect(urls).not.toContain(urlFor('badgirl', '2026-10-18'));
    });

    it('finds the days the app was not opened (Thursday to Sunday, opened on Monday)', async () => {
        const monday = new Date('2026-10-19T04:00:00Z');
        const thursday = urlFor('badgirl', '2026-10-15');
        const saturday = urlFor('gongzi', '2026-10-17');

        const result = await probeRecentRecordings({
            probe: found([thursday, saturday]),
            now: monday,
        });

        // 由最近嘅日子 probe 起，所以次序唔重要
        expect(new Set(result.map((r) => r.url))).toEqual(new Set([thursday, saturday]));
    });

    it("skips today's shows that have not aired yet", async () => {
        const saturdayNoon = new Date('2026-10-17T04:00:00Z');
        const probe = found([]);

        await probeRecentRecordings({ probe, now: saturdayNoon });

        const urls = vi.mocked(probe).mock.calls.map(([url]) => url);
        expect(urls).not.toContain(urlFor('gongzi', '2026-10-17'));
        expect(urls).toContain(urlFor('westair', '2026-10-17'));
    });

    it('skips shows already stored for that date', async () => {
        const probe = found([]);
        const stored: Recording = {
            showId: 'badgirl',
            date: '2026-10-19',
            time: '1009',
            url: REAL_URLS.badgirl,
        };
        writeProbeState({ found: [stored], misses: {} });

        await probeRecentRecordings({ probe, now: NOW });

        expect(probe).toHaveBeenCalledTimes(WINDOW_SLOTS - 1);
        expect(probe).not.toHaveBeenCalledWith(REAL_URLS.badgirl);
    });

    it('remembers found files and never probes them again', async () => {
        await probeRecentRecordings({ probe: found([REAL_URLS.badgirl]), now: NOW });
        const again = found([]);

        const result = await probeRecentRecordings({ probe: again, now: NOW });

        expect(again).not.toHaveBeenCalledWith(REAL_URLS.badgirl);
        expect(result.map((r) => r.url)).toEqual([REAL_URLS.badgirl]);
    });

    describe('keeping the newest recordings per show', () => {
        /** 由 2026-01-01 起計第 index 日（遠早過回看期，唔會同 probe 撞） */
        const oldRecording = (
            showId: Recording['showId'],
            index: number,
            time = '1009',
        ): Recording => {
            const date = new Date(Date.UTC(2026, 0, 1) + index * MS_PER_DAY)
                .toISOString()
                .slice(0, 10);
            return { showId, date, time, url: `${urlFor(showId, date)}?t=${time}` };
        };
        const many = (showId: Recording['showId'], count: number): Recording[] =>
            Array.from({ length: count }, (_, index) => oldRecording(showId, index));

        it(`keeps only the newest ${PROBE_KEEP_PER_SHOW} recordings of a show`, async () => {
            const stored = many('badgirl', PROBE_KEEP_PER_SHOW + 2);
            writeProbeState({ found: stored, misses: {} });

            const result = await probeRecentRecordings({ probe: found([]), now: NOW });

            expect(result).toEqual(stored.slice(2));
            expect(readProbeState().found).toEqual(stored.slice(2));
        });

        it('counts each show separately', async () => {
            const badgirl = many('badgirl', PROBE_KEEP_PER_SHOW);
            const westair = oldRecording('westair', 0);
            writeProbeState({ found: [westair, ...badgirl], misses: {} });

            const result = await probeRecentRecordings({ probe: found([]), now: NOW });

            expect(result).toEqual([westair, ...badgirl]);
        });

        it('uses the time to break a tie on the same date', async () => {
            const stored = many('badgirl', PROBE_KEEP_PER_SHOW);
            const earlier = oldRecording('badgirl', 0, '0900');
            writeProbeState({ found: [earlier, ...stored], misses: {} });

            const result = await probeRecentRecordings({ probe: found([]), now: NOW });

            expect(result).not.toContainEqual(earlier);
            expect(result).toHaveLength(PROBE_KEEP_PER_SHOW);
        });

        it('keeps old recordings when the show has fewer than the limit', async () => {
            const ancient = oldRecording('gongzi', 0);
            writeProbeState({ found: [ancient], misses: {} });

            const result = await probeRecentRecordings({ probe: found([]), now: NOW });

            expect(result).toEqual([ancient]);
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

        it('treats UTC 16:30 (HK 00:30) as the next HK day', async () => {
            const probe = found([]);

            await probeRecentRecordings({ probe, now: new Date('2026-10-19T16:30:00Z') });

            // 香港 20 號（二）00:30：回看 7–20 號；今日未有節目開咪，所以冇 20 號
            expect(probedDates(probe)).toEqual(
                new Set([
                    '20261007',
                    '20261008',
                    '20261009',
                    '20261010',
                    '20261012',
                    '20261013',
                    '20261014',
                    '20261015',
                    '20261016',
                    '20261017',
                    '20261019',
                ]),
            );
        });

        it('treats UTC 15:59 (HK 23:59) as still the same HK day', async () => {
            const probe = found([]);

            await probeRecentRecordings({ probe, now: new Date('2026-10-19T15:59:00Z') });

            // 香港 19 號（一）23:59：回看 6–19 號
            expect(probedDates(probe)).toEqual(
                new Set([
                    '20261006',
                    '20261007',
                    '20261008',
                    '20261009',
                    '20261010',
                    '20261012',
                    '20261013',
                    '20261014',
                    '20261015',
                    '20261016',
                    '20261017',
                    '20261019',
                ]),
            );
        });
    });

    it('waits PROBE_RETRY_MS before probing a missing file again', async () => {
        await probeRecentRecordings({ probe: found([]), now: NOW });
        const soon = found([]);
        const later = found([]);

        await probeRecentRecordings({ probe: soon, now: new Date(NOW.getTime() + 1) });
        await probeRecentRecordings({
            probe: later,
            now: new Date(NOW.getTime() + PROBE_RETRY_MS),
        });

        expect(soon).not.toHaveBeenCalled();
        // 只有尋日（19 號 5 個）同今日（20 號已開咪嘅 3 個）會再試；更早嘅日子已定，要等 PROBE_SETTLED_RETRY_MS
        expect(later).toHaveBeenCalledTimes(8);
        expect(later).not.toHaveBeenCalledWith(urlFor('badgirl', '2026-10-16'));
    });

    it('gives a miss from a recent day one more try once that day is settled', async () => {
        await probeRecentRecordings({ probe: found([]), now: NOW });
        const friday = daysAfter(NOW, 3);
        const first = found([]);
        const second = found([]);

        await probeRecentRecordings({ probe: first, now: friday });
        await probeRecentRecordings({
            probe: second,
            now: new Date(friday.getTime() + PROBE_RETRY_MS),
        });

        // 19 號嘅 miss 係 20 號記低（當時可能仲未上架），所以 23 號會再試一次，之後已定，隔 PROBE_SETTLED_RETRY_MS 先再試
        expect(first).toHaveBeenCalledWith(urlFor('badgirl', '2026-10-19'));
        expect(second).not.toHaveBeenCalledWith(urlFor('badgirl', '2026-10-19'));
    });

    it('gives a miss recorded on the broadcast day itself its extra try too', async () => {
        await probeRecentRecordings({ probe: found([]), now: NOW });
        const friday = daysAfter(NOW, 3);
        const first = found([]);
        const second = found([]);

        await probeRecentRecordings({ probe: first, now: friday });
        await probeRecentRecordings({
            probe: second,
            now: new Date(friday.getTime() + PROBE_RETRY_MS),
        });

        // 20 號嘅 miss 係 20 號當日記低，23 號再試一次；之後已定，唔會隔 30 分鐘又試
        expect(first).toHaveBeenCalledWith(urlFor('badgirl', '2026-10-20'));
        expect(second).not.toHaveBeenCalledWith(urlFor('badgirl', '2026-10-20'));
    });

    describe('settled rule at the HK midnight boundary', () => {
        const broadcast = urlFor('badgirl', '2026-10-19');
        /** 記低 19 號 Bad Girl 喺 missedAt 搵唔到，再喺 PROBE_RETRY_MS 之後行一次 */
        const retryAfterMissAt = async (missedAt: Date): Promise<AudioProber> => {
            writeProbeState({ found: [], misses: { 'badgirl:2026-10-19': missedAt.getTime() } });
            const probe = found([]);
            await probeRecentRecordings({
                probe,
                now: new Date(missedAt.getTime() + PROBE_RETRY_MS),
            });
            return probe;
        };

        it('treats a miss at broadcast + 1 day, HK 23:59, as recent (30-minute retry)', async () => {
            // UTC 15:59 = 香港 20 號 23:59
            const probe = await retryAfterMissAt(new Date('2026-10-20T15:59:00Z'));

            expect(probe).toHaveBeenCalledWith(broadcast);
        });

        it('treats a miss at broadcast + 2 days, HK 00:00, as settled (no 30-minute retry)', async () => {
            // UTC 16:00 = 香港 21 號 00:00
            const probe = await retryAfterMissAt(new Date('2026-10-20T16:00:00Z'));

            expect(probe).not.toHaveBeenCalledWith(broadcast);
        });
    });

    describe('settled misses', () => {
        const settled = urlFor('badgirl', '2026-10-16');

        it(`are not retried before PROBE_SETTLED_RETRY_MS`, async () => {
            await probeRecentRecordings({ probe: found([]), now: NOW });
            const tooSoon = found([]);

            await probeRecentRecordings({
                probe: tooSoon,
                now: new Date(NOW.getTime() + PROBE_SETTLED_RETRY_MS - 1),
            });

            expect(tooSoon).not.toHaveBeenCalledWith(settled);
        });

        it('are retried after PROBE_SETTLED_RETRY_MS, so a late upload is still found', async () => {
            await probeRecentRecordings({ probe: found([]), now: NOW });
            const nextDay = found([settled]);

            const result = await probeRecentRecordings({
                probe: nextDay,
                now: new Date(NOW.getTime() + PROBE_SETTLED_RETRY_MS),
            });

            expect(nextDay).toHaveBeenCalledWith(settled);
            expect(result.map((r) => r.url)).toContain(settled);
        });

        it('retry far less often than recent misses', () => {
            expect(PROBE_SETTLED_RETRY_MS).toBeGreaterThan(PROBE_RETRY_MS);
        });
    });

    it(`drops misses older than ${PROBE_LOOKBACK_DAYS} days so storage does not grow`, async () => {
        await probeRecentRecordings({ probe: found([]), now: NOW });

        await probeRecentRecordings({ probe: found([]), now: daysAfter(NOW, 15) });

        const dates = new Set(Object.keys(readProbeState().misses).map(dateFromShowDateKey));
        // 15 日後（11 月 4 號（三）12:00）只保留 10 月 22 號至 11 月 4 號有節目嘅日子（星期日冇）
        expect(dates).toEqual(
            new Set([
                '2026-10-22',
                '2026-10-23',
                '2026-10-24',
                '2026-10-26',
                '2026-10-27',
                '2026-10-28',
                '2026-10-29',
                '2026-10-30',
                '2026-10-31',
                '2026-11-02',
                '2026-11-03',
                '2026-11-04',
            ]),
        );
    });

    describe('progress during a run', () => {
        /** 第一個 probe 搵到 firstUrl，之後嘅 probe 永遠唔返（好似 app 中途閂咗） */
        const stallAfterFirst = (firstUrl: string): AudioProber => {
            let calls = 0;
            return vi.fn((url: string): Promise<ProbeResult> => {
                calls += 1;
                if (calls === 1) {
                    return Promise.resolve(url === firstUrl ? 'found' : 'missing');
                }
                return new Promise<ProbeResult>(() => {});
            });
        };
        // NOW 係 20 號（二）12:00，第一個 probe 嘅係當日嘅 Bad Girl
        const firstUrl = urlFor('badgirl', '2026-10-20');

        it('saves each find right away, so closing the app mid-run keeps it', async () => {
            const probe = stallAfterFirst(firstUrl);

            void probeRecentRecordings({ probe, now: NOW });

            await vi.waitFor(() => expect(probe).toHaveBeenCalledTimes(2));
            expect(readProbeState().found.map((r) => r.url)).toEqual([firstUrl]);
        });

        it('saves each miss right away too', async () => {
            const probe = stallAfterFirst('none');

            void probeRecentRecordings({ probe, now: NOW });

            await vi.waitFor(() => expect(probe).toHaveBeenCalledTimes(2));
            expect(readProbeState().misses).toEqual({ 'badgirl:2026-10-20': NOW.getTime() });
        });

        it('reports each find through onFound before the run completes', async () => {
            const onFound = vi.fn<(recording: Recording) => void>();

            void probeRecentRecordings({ probe: stallAfterFirst(firstUrl), now: NOW, onFound });

            await vi.waitFor(() => expect(onFound).toHaveBeenCalledTimes(1));
            expect(onFound).toHaveBeenCalledWith<[Recording]>({
                showId: 'badgirl',
                date: '2026-10-20',
                time: '1009',
                url: firstUrl,
            });
        });

        it('calls onFound once per find and never for misses', async () => {
            const onFound = vi.fn<(recording: Recording) => void>();
            const thursday = urlFor('badgirl', '2026-10-15');

            await probeRecentRecordings({
                probe: found([REAL_URLS.badgirl, thursday]),
                now: NOW,
                onFound,
            });

            expect(onFound.mock.calls.map(([r]) => r.url)).toEqual([REAL_URLS.badgirl, thursday]);
        });
    });

    it('still returns results when storage is unavailable', async () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('full', 'QuotaExceededError');
        });

        const result = await probeRecentRecordings({
            probe: found([REAL_URLS.badgirl]),
            now: NOW,
        });

        expect(result).toHaveLength(1);
        vi.restoreAllMocks();
    });

    it('ignores corrupted storage', async () => {
        localStorage.setItem(PROBE_STORAGE_KEY, '{not json');

        await expect(probeRecentRecordings({ probe: found([]), now: NOW })).resolves.toEqual([]);
    });
});

describe('readStoredRecordings', () => {
    beforeEach(() => localStorage.clear());

    const remembered: Recording = {
        showId: 'badgirl',
        date: '2026-10-19',
        time: '1009',
        url: REAL_URLS.badgirl,
    };

    it('returns stored recordings synchronously without probing', () => {
        writeProbeState({ found: [remembered], misses: {} });

        expect(readStoredRecordings()).toEqual([remembered]);
    });

    it(`returns at most ${PROBE_KEEP_PER_SHOW} recordings per show`, () => {
        const stored = Array.from({ length: PROBE_KEEP_PER_SHOW + 1 }, (_, index) => ({
            ...remembered,
            date: new Date(Date.UTC(2026, 0, 1) + index * MS_PER_DAY).toISOString().slice(0, 10),
            url: `${REAL_URLS.badgirl}?n=${index}`,
        }));
        writeProbeState({ found: stored, misses: {} });

        expect(readStoredRecordings()).toEqual(stored.slice(1));
    });

    it('returns nothing when storage is empty', () => {
        expect(readStoredRecordings()).toEqual([]);
    });
});

describe('readUnavailableEpisodes', () => {
    it('lists recent misses as unavailable episodes with the show file time', () => {
        writeProbeState({ found: [], misses: { 'wanni:2026-10-20': NOW.getTime() } });

        expect(readUnavailableEpisodes(NOW)).toEqual([
            { showId: 'wanni', date: '2026-10-20', time: '0708' },
        ]);
    });

    it(`skips misses outside the ${PROBE_LOOKBACK_DAYS}-day lookback`, () => {
        writeProbeState({ found: [], misses: { 'wanni:2026-10-01': NOW.getTime() } });

        expect(readUnavailableEpisodes(NOW)).toEqual([]);
    });

    it('skips unknown shows and malformed keys', () => {
        writeProbeState({
            found: [],
            misses: { 'nobody:2026-10-20': 1, 'wanni:not-a-date': 1, wanni: 1 },
        });

        expect(readUnavailableEpisodes(NOW)).toEqual([]);
    });

    it('skips a miss whose recording has since been found', () => {
        const recording: Recording = {
            showId: 'wanni',
            date: '2026-10-19',
            time: '0708',
            url: REAL_URLS.wanni,
        };
        writeProbeState({ found: [recording], misses: { 'wanni:2026-10-19': 1 } });

        expect(readUnavailableEpisodes(NOW)).toEqual([]);
    });

    it('returns nothing when storage is empty', () => {
        expect(readUnavailableEpisodes(NOW)).toEqual([]);
    });
});

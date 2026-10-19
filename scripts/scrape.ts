import { SHOWS } from '../src/config/shows';
import { isRecording } from '../src/data/recordingValidation';
import type { Recording, RecordingsFeed, ShowId } from '../src/types/recording';
import { parseRecordings } from './parseRecordings';

const SITE_URL = 'https://hkfm903.live/';
const REQUEST_TIMEOUT_MS = 20_000;
const USER_AGENT = '903-player personal archive reader (+https://github.com/dcwhung/903-player)';

export type ShowFetcher = (showId: ShowId, showName: string) => Promise<Recording[]>;

/** 讀原站某節目頁，解析出錄音列表 */
export const fetchShowFromSite: ShowFetcher = async (showId, showName) => {
    const url = new URL(SITE_URL);
    url.searchParams.set('show', showName);
    const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${showName}`);
    }
    return parseRecordings(await response.text(), showId);
};

/** 逐個節目爬（唔並行，減輕原站負擔）；失敗或 0 集記為 null */
export const scrapeShows = async (
    fetchShow: ShowFetcher,
): Promise<Map<ShowId, Recording[] | null>> => {
    const results = new Map<ShowId, Recording[] | null>();
    for (const show of SHOWS) {
        try {
            const recordings = await fetchShow(show.id, show.name);
            results.set(show.id, recordings.length > 0 ? recordings : null);
        } catch (error) {
            console.error(`[scrape] ${show.name}: ${(error as Error).message}`);
            results.set(show.id, null);
        }
    }
    return results;
};

/** 合併新資料同上次 deploy 嘅資料：某節目爬唔到就沿用舊資料 */
export const buildFeed = (
    fresh: Map<ShowId, Recording[] | null>,
    fallback: Recording[],
    now: Date = new Date(),
): RecordingsFeed => ({
    generatedAt: now.toISOString(),
    recordings: SHOWS.flatMap(
        (show) => fresh.get(show.id) ?? fallback.filter((r) => r.showId === show.id),
    ),
});

/** 上次 deploy 嘅 feed（GitHub Pages），驗證後先用嚟做後備 */
export const loadFallback = async (
    url: string | undefined,
    fetchImpl: typeof fetch = fetch,
): Promise<Recording[]> => {
    if (!url) {
        return [];
    }
    try {
        const response = await fetchImpl(url);
        if (!response.ok) {
            return [];
        }
        const payload = (await response.json()) as { recordings?: unknown };
        return Array.isArray(payload.recordings) ? payload.recordings.filter(isRecording) : [];
    } catch {
        console.warn('[scrape] fallback unavailable');
        return [];
    }
};

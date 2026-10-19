import { SHOWS } from '../src/config/shows';
import { isRecording, uniqueByUrl } from '../src/data/recordingValidation';
import type { Recording, RecordingsFeed, ShowId } from '../src/types/recording';
import { parseAllRecordings, parseRecordings, type ParsedAll } from './parseRecordings';

const SITE_URL = 'https://hkfm903.live/';
const REQUEST_TIMEOUT_MS = 20_000;
const USER_AGENT = '903-player personal archive reader (+https://github.com/dcwhung/903-player)';

export type ShowFetcher = (showId: ShowId, showName: string) => Promise<Recording[]>;

export interface ScrapeSources {
    fetchShow: ShowFetcher;
    fetchAll: () => Promise<ParsedAll>;
}

const fetchSiteHtml = async (showName?: string): Promise<string> => {
    const url = new URL(SITE_URL);
    if (showName) {
        url.searchParams.set('show', showName);
    }
    const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${showName ?? 'all shows'}`);
    }
    return response.text();
};

/** 原站：各節目頁 + All Shows 頁 */
export const siteSources: ScrapeSources = {
    fetchShow: async (showId, showName) => parseRecordings(await fetchSiteHtml(showName), showId),
    fetchAll: async () => parseAllRecordings(await fetchSiteHtml()),
};

const settle = async <T>(task: () => Promise<T>, fallback: T, label: string): Promise<T> => {
    try {
        return await task();
    } catch (error) {
        console.error(`[scrape] ${label}: ${(error as Error).message}`);
        return fallback;
    }
};

/** 節目頁同 All 頁合併；節目頁 0 集但 All 頁有，即係 ?show= 名唔啱，出 warning */
const mergeShow = (showId: ShowId, name: string, page: Recording[], all: ParsedAll) => {
    const fromAll = all.recordings.filter((r) => r.showId === showId);
    if (page.length === 0 && fromAll.length > 0) {
        console.log(
            `::warning::${showId} (${name}): show page has 0 recordings but the all-shows page has ${fromAll.length}; check the ?show= name`,
        );
    }
    const merged = uniqueByUrl([...page, ...fromAll]);
    return merged.length > 0 ? merged : null;
};

/** 逐個節目爬（唔並行，減輕原站負擔）；失敗或 0 集記為 null */
export const scrapeShows = async (
    sources: ScrapeSources,
): Promise<Map<ShowId, Recording[] | null>> => {
    const all = await settle(sources.fetchAll, { recordings: [], unmatched: [] }, 'all shows');
    if (all.unmatched.length > 0) {
        console.log(
            `::notice::Shows on the site that the app does not list: ${all.unmatched.join(', ')}`,
        );
    }
    const results = new Map<ShowId, Recording[] | null>();
    for (const show of SHOWS) {
        const page = await settle(() => sources.fetchShow(show.id, show.name), [], show.name);
        results.set(show.id, mergeShow(show.id, show.name, page, all));
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
    recordings: uniqueByUrl(
        SHOWS.flatMap((show) => fresh.get(show.id) ?? fallback.filter((r) => r.showId === show.id)),
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

import { SHOWS, type ShowConfig } from '../src/config/shows';
import { isRecording, uniqueByUrl } from '../src/data/recordingValidation';
import type { Recording, RecordingsFeed, ShowId } from '../src/types/recording';
import {
    parseAllRecordings,
    parseRecordings,
    readNextPageUrl,
    type ParsedAll,
} from './parseRecordings';

const SITE_URL = 'https://hkfm903.live/';
const REQUEST_TIMEOUT_MS = 20_000;
const USER_AGENT = '903-player personal archive reader (+https://github.com/dcwhung/903-player)';
/** 每個列表最多跟幾多頁，防止原站分頁出錯時無限爬落去 */
export const MAX_PAGES = 10;
const ALL_SHOWS_LABEL = 'all shows';
const SHOW_PARAM = 'show';

export type ShowFetcher = (showId: ShowId, showName: string) => Promise<Recording[]>;

export interface ShowResult {
    recordings: Recording[];
    /** 節目頁成功而且有卡：可以完全取代舊資料；否則要同舊資料合併 */
    complete: boolean;
}

export interface ScrapeSources {
    fetchShow: ShowFetcher;
    fetchAll: () => Promise<ParsedAll>;
}

/** 攞一頁 HTML；可以注入，方便測試唔使真係連原站 */
export type HtmlFetcher = (url: string) => Promise<string>;

const fetchSiteHtml: HtmlFetcher = async (url) => {
    const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return response.text();
};

const siteUrl = (showName?: string): string => {
    const url = new URL(SITE_URL);
    if (showName) {
        url.searchParams.set(SHOW_PARAM, showName);
    }
    return url.href;
};

/**
 * 由第一頁開始逐頁跟「下一頁」（唔並行，減輕原站負擔）；網址重複或者到 MAX_PAGES 就停。
 * 任何一頁失敗就成個列表當失敗，等上層保留舊資料，唔好用唔齊嘅結果取代舊資料。
 */
export const fetchPages = async (
    firstUrl: string,
    label: string,
    fetchHtml: HtmlFetcher,
): Promise<string[]> => {
    const pages: string[] = [];
    const seen = new Set<string>();
    let url: string | null = firstUrl;
    while (url && !seen.has(url) && pages.length < MAX_PAGES) {
        seen.add(url);
        const html = await fetchHtml(url);
        pages.push(html);
        url = readNextPageUrl(html, url);
    }
    if (url && !seen.has(url)) {
        annotate('warning', `${label}: stopped after ${MAX_PAGES} pages, more pages remain`);
    }
    if (pages.length > 1) {
        annotate('notice', `${label}: fetched ${pages.length} pages`);
    }
    return pages;
};

const reportDropped = (showId: ShowId, dropped: string[]): void => {
    if (dropped.length > 0) {
        annotate(
            'warning',
            `${showId}: dropped ${dropped.length} cards from the show page: ${dropped.join(', ')}`,
        );
    }
};

/** 原站：各節目頁 + All Shows 頁（兩者都會跟分頁） */
export const createSiteSources = (fetchHtml: HtmlFetcher = fetchSiteHtml): ScrapeSources => ({
    fetchShow: async (showId, showName) => {
        const pages = await fetchPages(siteUrl(showName), showId, fetchHtml);
        const dropped: string[] = [];
        const recordings = parseRecordings(pages, showId, (title) => dropped.push(title));
        reportDropped(showId, dropped);
        return recordings;
    },
    fetchAll: async () =>
        parseAllRecordings(await fetchPages(siteUrl(), ALL_SHOWS_LABEL, fetchHtml)),
});

export const siteSources: ScrapeSources = createSiteSources();

const settle = async <T, F>(task: () => Promise<T>, fallback: F, label: string): Promise<T | F> => {
    try {
        return await task();
    } catch (error) {
        const message = (error as Error).message;
        console.error(`[scrape] ${label}: ${message}`);
        // console.error 喺 Actions 摘要睇唔到，所以另外出 warning annotation
        annotate('warning', `${label}: ${message}`);
        return fallback;
    }
};

/** GitHub Actions workflow command 嘅資料要 escape，防止原站文字插入其他指令 */
export const escapeWorkflowData = (value: string): string =>
    value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');

export const annotate = (level: 'notice' | 'warning', message: string): void =>
    console.log(`::${level}::${escapeWorkflowData(message)}`);

const reportAllPage = (all: ParsedAll): void => {
    if (all.unmatched.length > 0) {
        annotate(
            'notice',
            `Shows on the site that the app does not list: ${all.unmatched.join(', ')}`,
        );
    }
    if (all.conflicts.length > 0) {
        annotate('warning', `Badge and filename disagree, skipped: ${all.conflicts.join(', ')}`);
    }
};

/** 節目頁同 All 頁合併；節目頁失敗（null）或 0 集時結果唔完整，要保留舊資料 */
const mergeShow = (
    show: ShowConfig,
    page: Recording[] | null,
    all: ParsedAll,
): ShowResult | null => {
    const fromAll = all.recordings.filter((r) => r.showId === show.id);
    if (page?.length === 0 && fromAll.length > 0) {
        annotate(
            'warning',
            `${show.id} (${show.name}): show page has 0 recordings but the all-shows page has ${fromAll.length}; check the ?show= name`,
        );
    }
    const recordings = uniqueByUrl([...(page ?? []), ...fromAll]);
    return recordings.length > 0 ? { recordings, complete: (page?.length ?? 0) > 0 } : null;
};

const EMPTY_ALL: ParsedAll = { recordings: [], unmatched: [], conflicts: [] };

/** 逐個節目爬（唔並行，減輕原站負擔）；兩邊都冇資料就記為 null */
export const scrapeShows = async (
    sources: ScrapeSources,
): Promise<Map<ShowId, ShowResult | null>> => {
    const all = await settle(sources.fetchAll, EMPTY_ALL, ALL_SHOWS_LABEL);
    reportAllPage(all);
    const results = new Map<ShowId, ShowResult | null>();
    for (const show of SHOWS) {
        const page = await settle(() => sources.fetchShow(show.id, show.name), null, show.name);
        results.set(show.id, mergeShow(show, page, all));
    }
    return results;
};

/** 完整就取代舊資料；唔完整就同舊資料合併；冇就沿用舊資料 */
const recordingsFor = (result: ShowResult | null | undefined, old: Recording[]): Recording[] => {
    if (!result) {
        return old;
    }
    return result.complete ? result.recordings : [...result.recordings, ...old];
};

export const buildFeed = (
    fresh: Map<ShowId, ShowResult | null>,
    fallback: Recording[],
    now: Date = new Date(),
): RecordingsFeed => ({
    generatedAt: now.toISOString(),
    recordings: uniqueByUrl(
        SHOWS.flatMap((show) =>
            recordingsFor(
                fresh.get(show.id),
                fallback.filter((r) => r.showId === show.id),
            ),
        ),
    ),
});

/** Actions 摘要：每個節目幾多集，同埋指定日子有邊幾個節目 */
export const summariseFeed = (feed: RecordingsFeed, date: string): string => {
    const counts = SHOWS.map(
        (show) => `${show.id} ${feed.recordings.filter((r) => r.showId === show.id).length}`,
    );
    const onDate = SHOWS.filter((show) =>
        feed.recordings.some((r) => r.showId === show.id && r.date === date),
    ).map((show) => show.name);
    return `${counts.join(', ')} | ${date}: ${onDate.join(', ') || '-'}`;
};

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

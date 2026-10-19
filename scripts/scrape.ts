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
// 老實報上身份；唔好扮瀏覽器，亦唔好加任何為咗避開防爬嘅 header
const USER_AGENT = '903-player personal archive reader (+https://github.com/dcwhung/903-player)';
/** 每個列表最多跟幾多頁，防止原站分頁出錯時無限爬落去 */
export const MAX_PAGES = 10;
/** 對原站任何兩個請求之間最少等幾耐（跨節目、跨頁），避免一下子太多請求被 Cloudflare 擋 */
export const REQUEST_GAP_MS = 2_000;
/** 403 / 429 / 5xx 最多重試幾多次 */
export const MAX_RETRIES = 2;
/** 第 n 次重試前等幾耐（退避） */
export const RETRY_BACKOFF_MS: readonly number[] = [5_000, 15_000];
/** Retry-After 最多信幾耐，唔好因為原站一句話令 job 卡住 */
export const MAX_RETRY_AFTER_MS = 60_000;
const MS_PER_SECOND = 1_000;
const HTTP_FORBIDDEN = 403;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR = 500;
/** Retry-After 只接受秒數（日期格式唔理） */
const RETRY_AFTER_SECONDS = /^\d+$/;
const ALL_SHOWS_LABEL = 'all shows';
const SHOW_PARAM = 'show';

export interface ShowPage {
    recordings: Recording[];
    /** 冇爬晒所有頁（遇到舊資料停咗、到咗 MAX_PAGES 或者後面嘅頁失敗）：唔可以取代舊資料 */
    truncated: boolean;
}

export type ShowFetcher = (showId: ShowId, showName: string) => Promise<ShowPage>;

export interface ShowResult {
    recordings: Recording[];
    /** 節目頁成功而且有卡：可以完全取代舊資料；否則要同舊資料合併 */
    complete: boolean;
}

export interface RequestStats {
    /** 實際發出嘅請求數（包括重試） */
    requests: number;
    retries: number;
}

export interface ScrapeSources {
    fetchShow: ShowFetcher;
    fetchAll: () => Promise<ParsedAll>;
    /** 真原站先有；測試用嘅假來源可以唔提供 */
    requestStats?: () => RequestStats;
}

interface FetchedPages {
    pages: string[];
    /** 仲有下一頁未爬 */
    truncated: boolean;
}

/** 攞一頁 HTML；可以注入，方便測試唔使真係連原站 */
export type HtmlFetcher = (url: string) => Promise<string>;

/** 等一段時間；可以注入，測試唔使真係等 */
export type Sleep = (ms: number) => Promise<void>;

/** 判斷一頁有冇上次 feed 已經有嘅錄音 */
export type KnownCheck = (html: string) => boolean;

/** 錯誤訊息用：還原中文節目名方便睇；%FF 之類解唔到就照用原本網址 */
export const readableUrl = (url: string): string => {
    try {
        return decodeURI(url);
    } catch {
        return url;
    }
};

/** 原站 HTTP 錯誤：帶埋 status 同 Retry-After，等重試邏輯判斷 */
export class HttpError extends Error {
    readonly status: number;
    readonly retryAfterMs: number | null;

    constructor(status: number, retryAfterMs: number | null, url: string) {
        super(`HTTP ${status} for ${readableUrl(url)}`);
        this.status = status;
        this.retryAfterMs = retryAfterMs;
    }
}

const parseRetryAfter = (value: string | null): number | null =>
    value !== null && RETRY_AFTER_SECONDS.test(value.trim())
        ? Number(value.trim()) * MS_PER_SECOND
        : null;

export const fetchSiteHtml: HtmlFetcher = async (url) => {
    const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
        const retryAfter = parseRetryAfter(response.headers.get('Retry-After'));
        throw new HttpError(response.status, retryAfter, url);
    }
    return response.text();
};

const realSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 403 多數係 Cloudflare 限流、429 係太密、5xx 係原站暫時出事：值得等陣再試；其他 4xx 試幾多次都一樣 */
const isRetryable = (error: unknown): error is HttpError =>
    error instanceof HttpError &&
    (error.status === HTTP_FORBIDDEN ||
        error.status === HTTP_TOO_MANY_REQUESTS ||
        error.status >= HTTP_SERVER_ERROR);

/** 第 retry 次重試前等幾耐：退避時間，原站有 Retry-After 就等更耐（但有上限） */
const retryDelay = (error: HttpError, retry: number): number => {
    const backoff = RETRY_BACKOFF_MS[Math.min(retry, RETRY_BACKOFF_MS.length) - 1] ?? 0;
    return Math.max(backoff, Math.min(error.retryAfterMs ?? 0, MAX_RETRY_AFTER_MS));
};

interface PoliteFetcher {
    fetchHtml: HtmlFetcher;
    stats: RequestStats;
}

/** 包住 fetchHtml：每個請求之前（第一個除外）最少等 REQUEST_GAP_MS，可重試嘅錯誤就退避再試 */
const createPoliteFetcher = (fetchHtml: HtmlFetcher, sleep: Sleep): PoliteFetcher => {
    const stats: RequestStats = { requests: 0, retries: 0 };
    const request = async (url: string, wait: number): Promise<string> => {
        if (stats.requests > 0) {
            await sleep(wait);
        }
        stats.requests += 1;
        return fetchHtml(url);
    };
    const politeFetch: HtmlFetcher = async (url) => {
        let wait = REQUEST_GAP_MS;
        for (let retry = 1; ; retry += 1) {
            try {
                return await request(url, wait);
            } catch (error) {
                if (!isRetryable(error) || retry > MAX_RETRIES) {
                    throw error;
                }
                stats.retries += 1;
                wait = retryDelay(error, retry);
            }
        }
    };
    return { fetchHtml: politeFetch, stats };
};

const siteUrl = (showName?: string): string => {
    const url = new URL(SITE_URL);
    if (showName) {
        url.searchParams.set(SHOW_PARAM, showName);
    }
    return url.href;
};

/** 第 1 頁失敗就成個列表失敗（上層用舊資料）；之後嘅頁失敗就回傳 null，保留已爬到嘅頁 */
const fetchPage = async (
    url: string,
    pageCount: number,
    label: string,
    fetchHtml: HtmlFetcher,
): Promise<string | null> => {
    try {
        return await fetchHtml(url);
    } catch (error) {
        if (pageCount === 0) {
            throw error;
        }
        const message = (error as Error).message;
        annotate(
            'warning',
            `${label}: page ${pageCount + 1} failed, kept ${pageCount} pages: ${message}`,
        );
        return null;
    }
};

const finishPages = (label: string, pages: string[], truncated: boolean): FetchedPages => {
    if (pages.length > 1) {
        annotate('notice', `${label}: fetched ${pages.length} pages`);
    }
    return { pages, truncated };
};

const noneKnown: KnownCheck = () => false;

/**
 * 由第一頁開始逐頁跟「下一頁」（唔並行，減輕原站負擔）。
 * 一頁有上次 feed 已有嘅錄音就停（之後嘅頁舊資料已經有）；網址重複或者到 MAX_PAGES 都停。
 * 冇爬晒就標記 truncated，等上層同舊資料合併，唔會用唔齊嘅結果取代舊資料。
 */
export const fetchPages = async (
    firstUrl: string,
    label: string,
    fetchHtml: HtmlFetcher,
    hasKnown: KnownCheck = noneKnown,
): Promise<FetchedPages> => {
    const pages: string[] = [];
    const seen = new Set<string>();
    let url: string | null = firstUrl;
    while (url && !seen.has(url) && pages.length < MAX_PAGES) {
        seen.add(url);
        const html = await fetchPage(url, pages.length, label, fetchHtml);
        if (html === null) {
            return finishPages(label, pages, true);
        }
        pages.push(html);
        url = readNextPageUrl(html, url);
        if (hasKnown(html)) {
            return finishPages(label, pages, url !== null && !seen.has(url));
        }
    }
    const truncated = url !== null && !seen.has(url);
    if (truncated) {
        annotate('warning', `${label}: stopped after ${MAX_PAGES} pages, more pages remain`);
    }
    return finishPages(label, pages, truncated);
};

const reportDropped = (showId: ShowId, dropped: string[]): void => {
    if (dropped.length > 0) {
        annotate(
            'warning',
            `${showId}: dropped ${dropped.length} cards from the show page: ${dropped.join(', ')}`,
        );
    }
};

export interface SiteOptions {
    fetchHtml?: HtmlFetcher;
    /** 上次 feed 嘅錄音網址；空（第一次 deploy）就跟到 MAX_PAGES */
    knownUrls?: Iterable<string>;
    sleep?: Sleep;
}

/** 原站：各節目頁（跟分頁直至遇到舊資料）+ All Shows 第 1 頁；所有請求共用同一個節流 */
export const createSiteSources = ({
    fetchHtml = fetchSiteHtml,
    knownUrls = [],
    sleep = realSleep,
}: SiteOptions = {}): ScrapeSources => {
    const known = new Set(knownUrls);
    const client = createPoliteFetcher(fetchHtml, sleep);
    return {
        fetchShow: async (showId, showName) => {
            const hasKnown: KnownCheck = (html) =>
                parseRecordings(html, showId).some((r) => known.has(r.url));
            const fetched = await fetchPages(siteUrl(showName), showId, client.fetchHtml, hasKnown);
            const dropped: string[] = [];
            const recordings = parseRecordings(fetched.pages, showId, (t) => dropped.push(t));
            reportDropped(showId, dropped);
            return { recordings, truncated: fetched.truncated };
        },
        // 節目頁已經會跟分頁，All Shows 頁只係後備，攞第 1 頁就夠
        fetchAll: async () => parseAllRecordings(await client.fetchHtml(siteUrl())),
        requestStats: () => ({ ...client.stats }),
    };
};

const settle = async <T, F>(task: () => Promise<T>, fallback: F, label: string): Promise<T | F> => {
    try {
        return await task();
    } catch (error) {
        const message = (error as Error).message;
        // 錯誤訊息可能包含原站網址；stderr 都會被 runner 當指令解析，所以同樣要 escape
        console.error(`[scrape] ${label}: ${escapeWorkflowData(message)}`);
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

/** 每次 run 對原站發咗幾多請求，方便喺 Actions 摘要睇有冇太密 */
const reportRequests = (sources: ScrapeSources): void => {
    const stats = sources.requestStats?.();
    if (stats) {
        annotate('notice', `Requests: ${stats.requests} (retries: ${stats.retries})`);
    }
};

/** 節目頁同 All 頁合併；節目頁失敗（null）、0 集或者分頁截斷時結果唔完整，要保留舊資料 */
const mergeShow = (show: ShowConfig, page: ShowPage | null, all: ParsedAll): ShowResult | null => {
    const fromAll = all.recordings.filter((r) => r.showId === show.id);
    const fromPage = page?.recordings ?? [];
    if (page?.recordings.length === 0 && fromAll.length > 0) {
        annotate(
            'warning',
            `${show.id} (${show.name}): show page has 0 recordings but the all-shows page has ${fromAll.length}; check the ?show= name`,
        );
    }
    const recordings = uniqueByUrl([...fromPage, ...fromAll]);
    const complete = fromPage.length > 0 && !page?.truncated;
    return recordings.length > 0 ? { recordings, complete } : null;
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
    reportRequests(sources);
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

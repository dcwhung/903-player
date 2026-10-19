// @vitest-environment node
import type { Recording, ShowId } from '../src/types/recording';
import {
    buildFeed,
    createSiteSources,
    escapeWorkflowData,
    fetchPages,
    fetchSiteHtml,
    HttpError,
    isLiveScrapeEnabled,
    MAX_PAGES,
    MAX_RETRIES,
    MAX_RETRY_AFTER_MS,
    loadFallback,
    summariseFeed,
    readableUrl,
    REQUEST_GAP_MS,
    RETRY_BACKOFF_MS,
    scrapeShows,
    scrapeShowsIfEnabled,
    type HtmlFetcher,
    type ScrapeSources,
    type ShowResult,
} from './scrape';

const rec = (showId: ShowId, date: string): Recording => ({
    showId,
    date,
    time: '2308',
    url: `https://audio.hkfm903.live/${showId}/${date}.aac`,
});

beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

const sources = (overrides: Partial<ScrapeSources> = {}): ScrapeSources => ({
    fetchShow: vi.fn(async (showId: ShowId) => {
        if (showId === 'wanni') {
            throw new Error('timeout');
        }
        return {
            recordings: showId === 'gongzi' ? [rec('gongzi', '2026-10-17')] : [],
            truncated: false,
        };
    }),
    fetchAll: vi.fn(async () => ({
        recordings: [rec('badgirl', '2026-10-19'), rec('gongzi', '2026-10-17')],
        unmatched: ['口水多過浪花'],
        conflicts: [],
    })),
    ...overrides,
});

describe('scrapeShows', () => {
    it('treats a show page with recordings as complete', async () => {
        const results = await scrapeShows(sources());

        expect(results.get('gongzi')).toEqual({
            recordings: [rec('gongzi', '2026-10-17')],
            complete: true,
        });
    });

    it('marks all-shows-only data as incomplete when the show page is empty', async () => {
        const results = await scrapeShows(sources());

        expect(results.get('badgirl')).toEqual({
            recordings: [rec('badgirl', '2026-10-19')],
            complete: false,
        });
    });

    it('returns null when neither source has the show', async () => {
        const results = await scrapeShows(sources());

        expect(results.get('wanni')).toBeNull();
        expect(results.get('westair')).toBeNull();
    });

    it('still uses show pages when the all-shows page fails', async () => {
        const results = await scrapeShows(
            sources({
                fetchAll: vi.fn(async () => {
                    throw new Error('500');
                }),
            }),
        );

        expect(results.get('gongzi')?.complete).toBe(true);
        expect(results.get('badgirl')).toBeNull();
    });

    it('fetches the all-shows page once and each show page once', async () => {
        const s = sources();

        await scrapeShows(s);

        expect(s.fetchAll).toHaveBeenCalledTimes(1);
        expect(s.fetchShow).toHaveBeenCalledTimes(5);
    });

    it('emits GitHub Actions annotations', async () => {
        await scrapeShows(
            sources({
                fetchAll: vi.fn(async () => ({
                    recordings: [rec('badgirl', '2026-10-19')],
                    unmatched: ['口水多過浪花\n::error::x'],
                    conflicts: ['20261019_0000_西加航空.aac'],
                })),
            }),
        );

        const lines = vi.mocked(console.log).mock.calls.map(([line]) => String(line));
        expect(lines).toContainEqual(expect.stringMatching(/^::warning::badgirl/));
        expect(lines).toContainEqual(
            '::notice::Shows on the site that the app does not list: 口水多過浪花%0A::error::x',
        );
        expect(lines).toContainEqual(
            expect.stringMatching(/^::warning::Badge and filename disagree.*西加航空/),
        );
        expect(lines.some((line) => line.includes('\n'))).toBe(false);
    });
});

describe('scrapeShows fetch failures', () => {
    const lines = (): string[] => vi.mocked(console.log).mock.calls.map(([line]) => String(line));

    it('annotates a failed show page as a warning', async () => {
        await scrapeShows(sources());

        expect(lines()).toContainEqual(expect.stringMatching(/^::warning::.+: timeout$/));
    });

    it('escapes failure messages written to stderr too', async () => {
        await scrapeShows(
            sources({
                fetchAll: vi.fn(async () => {
                    throw new Error(
                        'HTTP 404 for https://hkfm903.live/?page=2\r\n::error::injected',
                    );
                }),
            }),
        );

        const errors = vi.mocked(console.error).mock.calls.map(([line]) => String(line));
        expect(errors.some((line) => line.includes('%0D%0A::error::injected'))).toBe(true);
        expect(errors.some((line) => /[\r\n]/.test(line))).toBe(false);
    });

    it('annotates a failed all-shows page as a warning', async () => {
        await scrapeShows(
            sources({
                fetchAll: vi.fn(async () => {
                    throw new Error('HTTP 500\nfor all');
                }),
            }),
        );

        expect(lines()).toContainEqual('::warning::all shows: HTTP 500%0Afor all');
    });
});

describe('isLiveScrapeEnabled', () => {
    it.each([undefined, '', 'true', 'TRUE', 'yes'])('keeps live scraping on for %j', (value) => {
        expect(isLiveScrapeEnabled(value)).toBe(true);
    });

    it.each(['false', 'FALSE', ' false '])('turns live scraping off for %j', (value) => {
        expect(isLiveScrapeEnabled(value)).toBe(false);
    });
});

describe('scrapeShowsIfEnabled', () => {
    const lines = (): string[] => vi.mocked(console.log).mock.calls.map(([line]) => String(line));

    it('sends no requests and returns no fresh results when disabled', async () => {
        const disabled = sources();

        const results = await scrapeShowsIfEnabled(false, disabled);

        expect(results.size).toBe(0);
        expect(disabled.fetchAll).not.toHaveBeenCalled();
        expect(disabled.fetchShow).not.toHaveBeenCalled();
        expect(lines()).toContainEqual(
            '::notice::Requests: 0 (live scrape disabled by SCRAPE_LIVE)',
        );
    });

    it('scrapes as usual when enabled', async () => {
        const enabled = sources();

        const results = await scrapeShowsIfEnabled(true, enabled);

        expect(enabled.fetchAll).toHaveBeenCalledTimes(1);
        expect(results.get('gongzi')?.complete).toBe(true);
    });

    it('lets buildFeed fall back to the previous feed for every show when disabled', async () => {
        const fallback = [rec('badgirl', '2026-10-19'), rec('westair', '2026-10-18')];

        const feed = buildFeed(await scrapeShowsIfEnabled(false, sources()), fallback);

        expect(feed.recordings).toEqual(fallback);
    });
});

describe('escapeWorkflowData', () => {
    it('escapes characters that would start a new workflow command', () => {
        expect(escapeWorkflowData('a%b\r\nc')).toBe('a%25b%0D%0Ac');
    });
});

describe('buildFeed', () => {
    const fallback = [
        rec('wanni', '2026-10-14'),
        rec('wanni', '2026-10-15'),
        rec('wanni', '2026-10-16'),
    ];
    const feedFor = (result: ShowResult | null) =>
        buildFeed(new Map([['wanni', result]]), fallback, new Date('2026-10-19T00:00:00Z'));

    it('keeps the old history when only partial all-shows data is fresh', () => {
        const feed = feedFor({ recordings: [rec('wanni', '2026-10-19')], complete: false });

        expect(feed.recordings.map((r) => r.date)).toEqual([
            '2026-10-19',
            '2026-10-14',
            '2026-10-15',
            '2026-10-16',
        ]);
    });

    it('replaces the history when the show page was complete', () => {
        const feed = feedFor({ recordings: [rec('wanni', '2026-10-19')], complete: true });

        expect(feed.recordings.map((r) => r.date)).toEqual(['2026-10-19']);
    });

    it('prefers the fresh copy when an incomplete result overlaps the history', () => {
        const fresh = { ...rec('wanni', '2026-10-16'), time: '2000' };

        const feed = feedFor({ recordings: [fresh], complete: false });

        expect(feed.recordings.filter((r) => r.date === '2026-10-16')).toEqual([fresh]);
        expect(feed.recordings).toHaveLength(3);
    });

    it('falls back entirely when the show was not scraped', () => {
        expect(feedFor(null).recordings).toEqual(fallback);
    });

    it('stamps the generation time and drops duplicate urls', () => {
        const feed = buildFeed(
            new Map([
                [
                    'gongzi',
                    {
                        recordings: [rec('gongzi', '2026-10-17'), rec('gongzi', '2026-10-17')],
                        complete: true,
                    },
                ],
            ]),
            [],
            new Date('2026-10-19T00:00:00Z'),
        );

        expect(feed.generatedAt).toBe('2026-10-19T00:00:00.000Z');
        expect(feed.recordings).toEqual([rec('gongzi', '2026-10-17')]);
    });
});

describe('loadFallback', () => {
    const respond = (body: unknown, ok = true) =>
        vi.fn(async () => ({ ok, json: async () => body }) as Response);

    it('returns only valid recordings from the previous feed', async () => {
        const fetchMock = respond({
            recordings: [
                rec('gongzi', '2026-10-17'),
                { showId: 'gongzi', url: 'https://evil.example.com' },
            ],
        });

        await expect(loadFallback('https://x/data.json', fetchMock)).resolves.toEqual([
            rec('gongzi', '2026-10-17'),
        ]);
    });

    it('returns an empty list on HTTP errors, bad payloads or no url', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        await expect(loadFallback('https://x', respond({}, false))).resolves.toEqual([]);
        await expect(loadFallback('https://x', respond({ foo: 1 }))).resolves.toEqual([]);
        await expect(loadFallback(undefined)).resolves.toEqual([]);
        const failing = vi.fn(async () => {
            throw new Error('offline');
        });
        await expect(loadFallback('https://x', failing)).resolves.toEqual([]);
    });
});

describe('summariseFeed', () => {
    it('lists per-show counts and the shows recorded today', () => {
        const feed = {
            generatedAt: 'x',
            recordings: [
                rec('badgirl', '2026-10-19'),
                rec('badgirl', '2026-10-16'),
                rec('wanni', '2026-10-19'),
            ],
        };

        expect(summariseFeed(feed, '2026-10-19')).toBe(
            'badgirl 2, gongzi 0, wanni 1, sunnyday 0, westair 0 | 2026-10-19: Bad Girl大過佬, 雲妮鍾情',
        );
    });
});

const SITE = 'https://hkfm903.live/';
const SHOW_URL = `${SITE}?show=%E5%85%AC%E5%AD%90%E6%9C%83`;

const audioUrl = (title: string): string =>
    `https://audio.hkfm903.live/x/${encodeURIComponent(title)}`;

const card = (title: string, show = '公子會'): string => `<div class="recording-card">
    <h5 class="card-title">${title}</h5>
    <span class="badge">${show}</span>
    <audio><source src="${audioUrl(title)}"></audio>
</div>`;

const nextLink = (href: string): string => `<a rel="next" href="${href}">Next</a>`;

/** 假網站：url → html；冇登記嘅 url 當 404 */
const fakeSite = (pages: Record<string, string>) =>
    vi.fn(async (url: string) => {
        const html = pages[url];
        if (html === undefined) {
            throw new HttpError(404, null, url);
        }
        return html;
    });

/** 測試唔使真係等 */
const fakeSleep = () => vi.fn(async (_ms: number) => {});

/** 測試用原站來源：唔等、可以指定上次 feed 已有嘅網址 */
const siteFor = (fetchHtml: HtmlFetcher, knownUrls: string[] = [], sleep = fakeSleep()) =>
    createSiteSources({ fetchHtml, knownUrls, sleep });

const logLines = (): string[] => vi.mocked(console.log).mock.calls.map(([line]) => String(line));

describe('fetchPages', () => {
    it('fetches a single page and stays quiet when there is no pagination', async () => {
        const fetchHtml = fakeSite({ [SITE]: card('20261017_2308_公子會.aac') });

        const { pages, truncated } = await fetchPages(SITE, 'all shows', fetchHtml);

        expect(pages).toHaveLength(1);
        expect(truncated).toBe(false);
        expect(fetchHtml).toHaveBeenCalledTimes(1);
        expect(logLines()).toEqual([]);
    });

    it('follows next links in order and announces the page count', async () => {
        const fetchHtml = fakeSite({
            [SITE]: nextLink('/?page=2'),
            [`${SITE}?page=2`]: nextLink('/?page=3'),
            [`${SITE}?page=3`]: '<p>last</p>',
        });

        const { pages, truncated } = await fetchPages(SITE, 'all shows', fetchHtml);

        expect(fetchHtml.mock.calls.map(([url]) => url)).toEqual([
            SITE,
            `${SITE}?page=2`,
            `${SITE}?page=3`,
        ]);
        expect(pages).toHaveLength(3);
        expect(truncated).toBe(false);
        expect(logLines()).toContain('::notice::all shows: fetched 3 pages');
    });

    it('stops when a next link points back to a page already fetched', async () => {
        const fetchHtml = fakeSite({
            [SITE]: nextLink('/?page=2'),
            [`${SITE}?page=2`]: nextLink('/'),
        });

        const { pages, truncated } = await fetchPages(SITE, 'all shows', fetchHtml);

        expect(pages).toHaveLength(2);
        expect(truncated).toBe(false);
        expect(fetchHtml).toHaveBeenCalledTimes(2);
    });

    it(`stops after ${MAX_PAGES} pages and warns that more remain`, async () => {
        const fetchHtml = vi.fn(async (url: string) => {
            const page = Number(new URL(url).searchParams.get('page') ?? '1');
            return nextLink(`/?page=${page + 1}`);
        });

        const { pages, truncated } = await fetchPages(SITE, 'all shows', fetchHtml);

        expect(pages).toHaveLength(MAX_PAGES);
        expect(truncated).toBe(true);
        expect(fetchHtml).toHaveBeenCalledTimes(MAX_PAGES);
        expect(logLines()).toContainEqual(expect.stringMatching(/^::warning::all shows: stopped/));
    });

    it('fails as a whole when the first page fails, so only old data is used', async () => {
        await expect(fetchPages(SITE, 'all shows', fakeSite({}))).rejects.toThrow('404');
    });

    it('keeps the pages fetched so far when a later page fails, marked truncated', async () => {
        const fetchHtml = vi.fn(async (url: string) => {
            if (url === SITE) {
                return nextLink('/?page=2');
            }
            throw new Error('HTTP 403\n::error::injected');
        });

        const { pages, truncated } = await fetchPages(SITE, 'gongzi', fetchHtml);

        expect(pages).toHaveLength(1);
        expect(truncated).toBe(true);
        expect(logLines()).toContain(
            '::warning::gongzi: page 2 failed, kept 1 pages: HTTP 403%0A::error::injected',
        );
    });
});

describe('fetchPages with known recordings', () => {
    const hasKnown = (html: string): boolean => html.includes('known');

    it('stops at the first page that overlaps known data and marks it truncated', async () => {
        const fetchHtml = fakeSite({
            [SITE]: `new ${nextLink('/?page=2')}`,
            [`${SITE}?page=2`]: `known ${nextLink('/?page=3')}`,
            [`${SITE}?page=3`]: 'older',
        });

        const { pages, truncated } = await fetchPages(SITE, 'gongzi', fetchHtml, hasKnown);

        expect(pages).toHaveLength(2);
        expect(truncated).toBe(true);
        expect(fetchHtml).toHaveBeenCalledTimes(2);
        expect(logLines().some((line) => line.startsWith('::warning::'))).toBe(false);
    });

    it('is complete when the overlapping page is also the last page', async () => {
        const fetchHtml = fakeSite({ [SITE]: 'known' });

        const { truncated } = await fetchPages(SITE, 'gongzi', fetchHtml, hasKnown);

        expect(truncated).toBe(false);
    });
});

describe('fetchPages on a single page with self-links', () => {
    it('fetches once and stays quiet', async () => {
        const fetchHtml = fakeSite({
            [SITE]: `<ul class="pagination">
                <li class="page-item active"><a class="page-link" href="#">1</a></li>
                <li class="page-item disabled"><a class="page-link" href="#">Next</a></li>
            </ul>${nextLink('#')}`,
        });

        const { pages, truncated } = await fetchPages(SITE, 'all shows', fetchHtml);

        expect(pages).toHaveLength(1);
        expect(truncated).toBe(false);
        expect(fetchHtml).toHaveBeenCalledTimes(1);
        expect(logLines()).toEqual([]);
    });
});

describe('createSiteSources', () => {
    it('combines show-page cards from every page', async () => {
        const fetchHtml = fakeSite({
            [SHOW_URL]: card('20261017_2308_公子會.aac') + nextLink(`${SHOW_URL}&page=2`),
            [`${SHOW_URL}&page=2`]: card('20261010_2308_公子會.aac'),
        });

        const page = await siteFor(fetchHtml).fetchShow('gongzi', '公子會');

        expect(fetchHtml).toHaveBeenCalledWith(SHOW_URL);
        expect(page.recordings.map((r) => r.date)).toEqual(['2026-10-17', '2026-10-10']);
        expect(page.truncated).toBe(false);
        expect(logLines()).toContain('::notice::gongzi: fetched 2 pages');
    });

    it('stops paging a show once a page has a recording from the previous feed', async () => {
        const known = '20261010_2308_公子會.aac';
        const fetchHtml = fakeSite({
            [SHOW_URL]: card('20261017_2308_公子會.aac') + nextLink(`${SHOW_URL}&page=2`),
            [`${SHOW_URL}&page=2`]: card(known) + nextLink(`${SHOW_URL}&page=3`),
        });

        const page = await siteFor(fetchHtml, [audioUrl(known)]).fetchShow('gongzi', '公子會');

        expect(fetchHtml).toHaveBeenCalledTimes(2);
        expect(page.recordings.map((r) => r.date)).toEqual(['2026-10-17', '2026-10-10']);
        expect(page.truncated).toBe(true);
    });

    it('fetches only the first all-shows page', async () => {
        const fetchHtml = fakeSite({
            [SITE]: card('20261017_2308_公子會.aac') + nextLink('/?page=2'),
            [`${SITE}?page=2`]: card('20261019_0000_口水多過浪花.aac', '口水多過浪花'),
        });

        const all = await siteFor(fetchHtml).fetchAll();

        expect(fetchHtml.mock.calls.map(([url]) => url)).toEqual([SITE]);
        expect(all.recordings.map((r) => r.showId)).toEqual(['gongzi']);
        expect(all.unmatched).toEqual([]);
    });
});

describe('show pages cut off at MAX_PAGES', () => {
    /** 公子會頁永遠有下一頁；其他頁冇卡 */
    const endlessShowPage = vi.fn(async (url: string) => {
        if (!url.startsWith(SHOW_URL)) {
            return '';
        }
        const page = Number(new URL(url).searchParams.get('page') ?? '1');
        return card('20261017_2308_公子會.aac') + nextLink(`${SHOW_URL}&page=${page + 1}`);
    });

    it('marks the show result as incomplete', async () => {
        const results = await scrapeShows(siteFor(endlessShowPage));

        expect(results.get('gongzi')?.complete).toBe(false);
    });

    it('merges with the fallback instead of replacing it', async () => {
        const older = rec('gongzi', '2026-01-03');

        const feed = buildFeed(await scrapeShows(siteFor(endlessShowPage)), [older]);

        expect(feed.recordings).toContainEqual(older);
    });

    it('treats a truncated page from any fetcher as incomplete', async () => {
        const results = await scrapeShows(
            sources({
                fetchShow: vi.fn(async () => ({
                    recordings: [rec('gongzi', '2026-10-17')],
                    truncated: true,
                })),
            }),
        );

        expect(results.get('gongzi')?.complete).toBe(false);
    });
});

describe('show pages that overlap the previous feed', () => {
    const known = '20261010_2308_公子會.aac';
    /** 公子會第 1 頁已經有上次 feed 嘅錄音，仲有第 2 頁；其他頁冇卡 */
    const fetchHtml = vi.fn(async (url: string) =>
        url === SHOW_URL
            ? card('20261017_2308_公子會.aac') + card(known) + nextLink(`${SHOW_URL}&page=2`)
            : '',
    );
    const older = { ...rec('gongzi', '2026-01-03'), url: audioUrl('20260103_2308_公子會.aac') };

    it('fetches one page per show and keeps the history', async () => {
        const results = await scrapeShows(siteFor(fetchHtml, [audioUrl(known), older.url]));

        expect(fetchHtml.mock.calls.filter(([url]) => url.startsWith(SHOW_URL))).toHaveLength(1);
        expect(results.get('gongzi')?.complete).toBe(false);
        expect(buildFeed(results, [older]).recordings).toContainEqual(older);
    });
});

describe('createSiteSources dropped cards', () => {
    it('warns once about a card that belongs to another show', async () => {
        const fetchHtml = fakeSite({
            [SHOW_URL]: `${card('20261017_2308_公子會.aac')}${card('20261019_0000_西加航空.aac', '西加航空')}
                <ul class="pagination">
                    <li class="page-item active"><a class="page-link" href="#">1</a></li>
                    <li class="page-item disabled"><a class="page-link" href="#">Next</a></li>
                </ul>`,
        });

        const page = await siteFor(fetchHtml).fetchShow('gongzi', '公子會');

        expect(page.recordings.map((r) => r.date)).toEqual(['2026-10-17']);
        expect(logLines()).toEqual([
            '::warning::gongzi: dropped 1 cards from the show page: 20261019_0000_西加航空.aac',
        ]);
    });
});

describe('polite requests', () => {
    /** 按次序回應：數字 = HTTP 錯誤，字串 = HTML */
    const scripted = (...replies: (number | string)[]) =>
        vi.fn(async (url: string) => {
            const reply = replies.shift() ?? '';
            if (typeof reply === 'number') {
                throw new HttpError(reply, null, url);
            }
            return reply;
        });

    it(`waits ${REQUEST_GAP_MS}ms between any two requests, across shows`, async () => {
        const sleep = fakeSleep();
        const fetchHtml = vi.fn(async () => '');

        await scrapeShows(siteFor(fetchHtml, [], sleep));

        expect(fetchHtml).toHaveBeenCalledTimes(6);
        expect(sleep.mock.calls).toEqual(Array(5).fill([REQUEST_GAP_MS]));
    });

    it('retries 403, 429 and 5xx with backoff, then succeeds', async () => {
        const sleep = fakeSleep();
        const fetchHtml = scripted(403, 503, card('20261017_2308_公子會.aac'));

        const page = await siteFor(fetchHtml, [], sleep).fetchShow('gongzi', '公子會');

        expect(page.recordings).toHaveLength(1);
        expect(sleep.mock.calls).toEqual(RETRY_BACKOFF_MS.map((ms) => [ms]));
        expect(fetchHtml).toHaveBeenCalledTimes(1 + MAX_RETRIES);
    });

    it(`gives up after ${MAX_RETRIES} retries`, async () => {
        const fetchHtml = scripted(429, 429, 429, 'never');

        await expect(siteFor(fetchHtml).fetchAll()).rejects.toThrow('HTTP 429');
        expect(fetchHtml).toHaveBeenCalledTimes(1 + MAX_RETRIES);
    });

    it('fails immediately on other 4xx and on non-HTTP errors', async () => {
        const notFound = scripted(404, 'never');
        const offline = vi.fn(async () => {
            throw new Error('offline');
        });

        await expect(siteFor(notFound).fetchAll()).rejects.toThrow('HTTP 404');
        await expect(siteFor(offline).fetchAll()).rejects.toThrow('offline');
        expect(notFound).toHaveBeenCalledTimes(1);
        expect(offline).toHaveBeenCalledTimes(1);
    });

    it('honours a numeric Retry-After, capped', async () => {
        const sleep = fakeSleep();
        const replies = [new HttpError(429, 30_000, SITE), new HttpError(503, 10 ** 9, SITE)];
        const fetchHtml = vi.fn(async () => {
            const error = replies.shift();
            if (error) {
                throw error;
            }
            return '';
        });

        await siteFor(fetchHtml, [], sleep).fetchAll();

        expect(sleep.mock.calls).toEqual([[30_000], [MAX_RETRY_AFTER_MS]]);
    });

    it('announces the request and retry counts', async () => {
        await scrapeShows(siteFor(scripted(500, '')));

        expect(logLines()).toContain('::notice::Requests: 7 (retries: 1)');
    });
});

describe('fetchSiteHtml', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('identifies itself and reports the failing url decoded', async () => {
        const fetchMock = vi.fn(
            async (_url: string, _init?: RequestInit) => new Response('', { status: 404 }),
        );
        vi.stubGlobal('fetch', fetchMock);

        await expect(fetchSiteHtml(SHOW_URL)).rejects.toThrow(
            'HTTP 404 for https://hkfm903.live/?show=公子會',
        );
        const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
        expect(headers.get('User-Agent')).toMatch(/^903-player .*github\.com\/dcwhung\/903-player/);
    });

    it('reads a numeric Retry-After header in seconds and ignores dates', async () => {
        const respond = (retryAfter: string) =>
            vi.fn(
                async () =>
                    new Response('', { status: 429, headers: { 'Retry-After': retryAfter } }),
            );

        vi.stubGlobal('fetch', respond('12'));
        await expect(fetchSiteHtml(SITE)).rejects.toMatchObject({
            status: 429,
            retryAfterMs: 12_000,
        });
        vi.stubGlobal('fetch', respond('Wed, 21 Oct 2026 07:28:00 GMT'));
        await expect(fetchSiteHtml(SITE)).rejects.toMatchObject({ retryAfterMs: null });
    });
});

describe('readableUrl', () => {
    it('keeps the encoded url when it cannot be decoded', () => {
        expect(readableUrl('https://hkfm903.live/?x=%FF')).toBe('https://hkfm903.live/?x=%FF');
    });
});

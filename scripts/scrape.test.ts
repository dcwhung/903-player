// @vitest-environment node
import type { Recording, ShowId } from '../src/types/recording';
import {
    buildFeed,
    createSiteSources,
    escapeWorkflowData,
    fetchPages,
    MAX_PAGES,
    loadFallback,
    summariseFeed,
    readableUrl,
    scrapeShows,
    siteSources,
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

const card = (title: string, show = '公子會'): string => `<div class="recording-card">
    <h5 class="card-title">${title}</h5>
    <span class="badge">${show}</span>
    <audio><source src="https://audio.hkfm903.live/x/${encodeURIComponent(title)}"></audio>
</div>`;

const nextLink = (href: string): string => `<a rel="next" href="${href}">Next</a>`;

/** 假網站：url → html；冇登記嘅 url 當 404 */
const fakeSite = (pages: Record<string, string>) =>
    vi.fn(async (url: string) => {
        const html = pages[url];
        if (html === undefined) {
            throw new Error(`HTTP 404 for ${url}`);
        }
        return html;
    });

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

    it('fails as a whole when a later page fails, so old data is kept', async () => {
        const fetchHtml = fakeSite({ [SITE]: nextLink('/?page=2') });

        await expect(fetchPages(SITE, 'all shows', fetchHtml)).rejects.toThrow('404');
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

        const page = await createSiteSources(fetchHtml).fetchShow('gongzi', '公子會');

        expect(fetchHtml).toHaveBeenCalledWith(SHOW_URL);
        expect(page.recordings.map((r) => r.date)).toEqual(['2026-10-17', '2026-10-10']);
        expect(page.truncated).toBe(false);
        expect(logLines()).toContain('::notice::gongzi: fetched 2 pages');
    });

    it('combines all-shows cards from every page', async () => {
        const fetchHtml = fakeSite({
            [SITE]: card('20261017_2308_公子會.aac') + nextLink('/?page=2'),
            [`${SITE}?page=2`]: card('20261019_0000_口水多過浪花.aac', '口水多過浪花'),
        });

        const all = await createSiteSources(fetchHtml).fetchAll();

        expect(all.recordings.map((r) => r.showId)).toEqual(['gongzi']);
        expect(all.unmatched).toEqual(['口水多過浪花']);
        expect(logLines()).toContain('::notice::all shows: fetched 2 pages');
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
        const results = await scrapeShows(createSiteSources(endlessShowPage));

        expect(results.get('gongzi')?.complete).toBe(false);
    });

    it('merges with the fallback instead of replacing it', async () => {
        const older = rec('gongzi', '2026-01-03');

        const feed = buildFeed(await scrapeShows(createSiteSources(endlessShowPage)), [older]);

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

describe('createSiteSources dropped cards', () => {
    it('warns once about a card that belongs to another show', async () => {
        const fetchHtml = fakeSite({
            [SHOW_URL]: `${card('20261017_2308_公子會.aac')}${card('20261019_0000_西加航空.aac', '西加航空')}
                <ul class="pagination">
                    <li class="page-item active"><a class="page-link" href="#">1</a></li>
                    <li class="page-item disabled"><a class="page-link" href="#">Next</a></li>
                </ul>`,
        });

        const page = await createSiteSources(fetchHtml).fetchShow('gongzi', '公子會');

        expect(page.recordings.map((r) => r.date)).toEqual(['2026-10-17']);
        expect(logLines()).toEqual([
            '::warning::gongzi: dropped 1 cards from the show page: 20261019_0000_西加航空.aac',
        ]);
    });
});

describe('siteSources HTTP errors', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('reports the failing url decoded so show names are readable', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response('', { status: 503 })),
        );

        await expect(siteSources.fetchShow('gongzi', '公子會')).rejects.toThrow(
            'HTTP 503 for https://hkfm903.live/?show=公子會',
        );
    });
});

describe('readableUrl', () => {
    it('keeps the encoded url when it cannot be decoded', () => {
        expect(readableUrl('https://hkfm903.live/?x=%FF')).toBe('https://hkfm903.live/?x=%FF');
    });
});

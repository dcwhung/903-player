// @vitest-environment node
import type { Recording, ShowId } from '../src/types/recording';
import {
    buildFeed,
    escapeWorkflowData,
    loadFallback,
    summariseFeed,
    scrapeShows,
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
        return showId === 'gongzi' ? [rec('gongzi', '2026-10-17')] : [];
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

// @vitest-environment node
import type { Recording, ShowId } from '../src/types/recording';
import { buildFeed, loadFallback, scrapeShows, type ScrapeSources } from './scrape';

const rec = (showId: ShowId, date: string): Recording => ({
    showId,
    date,
    time: '2308',
    url: `https://audio.hkfm903.live/${showId}/${date}.aac`,
});

describe('scrapeShows', () => {
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
        })),
        ...overrides,
    });

    it('merges show pages with the all-shows page and de-duplicates', async () => {
        const s = sources();

        const results = await scrapeShows(s);

        expect(s.fetchShow).toHaveBeenCalledTimes(5);
        expect(s.fetchAll).toHaveBeenCalledTimes(1);
        expect(results.get('gongzi')).toEqual([rec('gongzi', '2026-10-17')]);
        expect(results.get('badgirl')).toEqual([rec('badgirl', '2026-10-19')]);
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

        expect(results.get('gongzi')).toEqual([rec('gongzi', '2026-10-17')]);
        expect(results.get('badgirl')).toBeNull();
    });

    it('warns in GitHub Actions format when a show page is empty but the all page is not', async () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});

        await scrapeShows(sources());

        const lines = log.mock.calls.map(([line]) => String(line));
        expect(lines).toContainEqual(expect.stringMatching(/^::warning::.*badgirl/));
        expect(lines).toContainEqual(expect.stringMatching(/^::notice::.*口水多過浪花/));
        log.mockRestore();
    });
});

describe('buildFeed', () => {
    const fallback = [rec('gongzi', '2026-10-10'), rec('wanni', '2026-10-16')];

    it('drops duplicate recordings', () => {
        const fresh = new Map<ShowId, Recording[] | null>([
            ['gongzi', [rec('gongzi', '2026-10-17'), rec('gongzi', '2026-10-17')]],
        ]);

        expect(buildFeed(fresh, []).recordings).toEqual([rec('gongzi', '2026-10-17')]);
    });

    it('uses fresh data and falls back per show when scraping failed', () => {
        const fresh = new Map<ShowId, Recording[] | null>([
            ['gongzi', [rec('gongzi', '2026-10-17')]],
            ['wanni', null],
        ]);

        const feed = buildFeed(fresh, fallback, new Date('2026-10-19T00:00:00Z'));

        expect(feed.generatedAt).toBe('2026-10-19T00:00:00.000Z');
        expect(feed.recordings).toEqual([rec('gongzi', '2026-10-17'), rec('wanni', '2026-10-16')]);
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
        await expect(loadFallback('https://x', respond({}, false))).resolves.toEqual([]);
        await expect(loadFallback('https://x', respond({ foo: 1 }))).resolves.toEqual([]);
        await expect(loadFallback(undefined)).resolves.toEqual([]);
        const failing = vi.fn(async () => {
            throw new Error('offline');
        });
        await expect(loadFallback('https://x', failing)).resolves.toEqual([]);
    });
});

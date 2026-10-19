// @vitest-environment node
import type { Recording, ShowId } from '../src/types/recording';
import { buildFeed, scrapeShows } from './scrape';

const rec = (showId: ShowId, date: string): Recording => ({
    showId,
    date,
    time: '2308',
    url: `https://audio.hkfm903.live/${showId}/${date}.aac`,
});

describe('scrapeShows', () => {
    it('collects each show, recording failures as null', async () => {
        const fetchShow = vi.fn(async (showId: ShowId) => {
            if (showId === 'wanni') {
                throw new Error('timeout');
            }
            return showId === 'gongzi' ? [rec('gongzi', '2026-10-17')] : [];
        });

        const results = await scrapeShows(fetchShow);

        expect(fetchShow).toHaveBeenCalledTimes(5);
        expect(results.get('gongzi')).toEqual([rec('gongzi', '2026-10-17')]);
        expect(results.get('wanni')).toBeNull();
        expect(results.get('badgirl')).toBeNull();
    });
});

describe('buildFeed', () => {
    const fallback = [rec('gongzi', '2026-10-10'), rec('wanni', '2026-10-16')];

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

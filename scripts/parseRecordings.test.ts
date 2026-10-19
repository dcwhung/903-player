// @vitest-environment node
import { readFileSync } from 'node:fs';
import { parseAllRecordings, parseRecordings } from './parseRecordings';

const read = (name: string) =>
    readFileSync(new URL(`../tests/fixtures/${name}`, import.meta.url), 'utf8');
const fixture = read('show-gongzi.html');

describe('parseRecordings', () => {
    it('parses every valid recording card', () => {
        const recordings = parseRecordings(fixture, 'gongzi');

        expect(recordings).toHaveLength(3);
        expect(recordings[0]).toEqual({
            showId: 'gongzi',
            date: '2026-10-17',
            time: '2308',
            url: 'https://audio.hkfm903.live/%E5%85%AC%E5%AD%90%E6%9C%83/20261017_2308_%E5%85%AC%E5%AD%90%E6%9C%83.aac',
        });
    });

    it('skips cards without a valid filename or with a foreign audio host', () => {
        const urls = parseRecordings(fixture, 'gongzi').map((r) => r.url);

        expect(urls.every((url) => url.startsWith('https://audio.hkfm903.live/'))).toBe(true);
    });

    it('returns an empty list for html without recordings', () => {
        expect(parseRecordings('<html><body>維護中</body></html>', 'gongzi')).toEqual([]);
    });
});

describe('parseAllRecordings', () => {
    const all = parseAllRecordings(read('all-shows.html'));

    it('assigns each card to a show by its badge, ignoring spacing and character variants', () => {
        expect(all.recordings.map((r) => [r.showId, r.date, r.time])).toEqual([
            ['badgirl', '2026-10-19', '1009'],
            ['sunnyday', '2026-10-19', '0809'],
            ['wanni', '2026-10-19', '0708'],
            ['gongzi', '2026-10-18', '2308'],
        ]);
    });

    it('falls back to the show name in the filename when a card has no badge', () => {
        expect(all.recordings.find((r) => r.showId === 'gongzi')?.url).toContain('20261018_2308');
    });

    it('reports show names it could not match', () => {
        expect(all.unmatched).toEqual(['口水多過浪花']);
    });
});

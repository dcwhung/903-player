// @vitest-environment node
import { readFileSync } from 'node:fs';
import { parseRecordings } from './parseRecordings';

const fixture = readFileSync(
    new URL('../tests/fixtures/show-gongzi.html', import.meta.url),
    'utf8',
);

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

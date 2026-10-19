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

describe('parseRecordings on non-aac files', () => {
    it('keeps cards whose file has another audio extension', () => {
        const html = `<div class="recording-card"><h5 class="card-title">20261019_1000_x.MP3</h5>
            <audio><source src="https://audio.hkfm903.live/x/20261019_1000_x.mp3"></audio></div>`;

        expect(parseRecordings(html, 'badgirl').map((r) => r.date)).toEqual(['2026-10-19']);
    });
});

describe('parseRecordings cross-check', () => {
    const card = (title: string, badge: string) =>
        `<div class="recording-card"><h5 class="card-title">${title}</h5><span class="badge">${badge}</span>
        <audio><source src="https://audio.hkfm903.live/x/${title}"></audio></div>`;

    it('drops cards that clearly belong to another show', () => {
        const html =
            card('20261019_1009_Bad_Girl大過佬.aac', 'Bad Girl大過佬') +
            card('20261018_2308_公子會.aac', '公子會') +
            card('20261017_1000_未知.aac', '');

        expect(parseRecordings(html, 'badgirl').map((r) => r.date)).toEqual([
            '2026-10-19',
            '2026-10-17',
        ]);
    });

    it('reports every dropped card, including badge / filename conflicts', () => {
        const dropped: string[] = [];
        const html =
            card('20261018_2308_公子會.aac', '公子會') +
            card('20261016_1000_公子會.aac', 'Bad Girl大過佬');

        expect(parseRecordings(html, 'badgirl', (title) => dropped.push(title))).toEqual([]);
        expect(dropped).toEqual(['20261018_2308_公子會.aac', '20261016_1000_公子會.aac']);
    });
});

describe('parseAllRecordings unmatched names', () => {
    it('reports the show name rather than a label badge', () => {
        const html = `<div class="recording-card"><h5 class="card-title">20261019_1510_口水多過浪花.aac</h5>
            <span class="badge">新</span><span class="badge">口水多過浪花</span>
            <audio><source src="https://audio.hkfm903.live/x/a.aac"></audio></div>`;

        expect(parseAllRecordings(html).unmatched).toEqual(['口水多過浪花']);
    });
});

describe('parseAllRecordings', () => {
    const all = parseAllRecordings(read('all-shows.html'));

    it('assigns cards to shows by badge or filename, ignoring spacing, variants and extra badges', () => {
        expect(all.recordings.map((r) => [r.showId, r.date, r.time])).toEqual([
            ['badgirl', '2026-10-19', '1009'],
            ['sunnyday', '2026-10-19', '0809'],
            ['wanni', '2026-10-19', '0708'],
            ['gongzi', '2026-10-18', '2308'],
            ['gongzi', '2026-10-17', '2308'],
        ]);
    });

    it('drops cards whose badge and filename name different shows', () => {
        expect(all.recordings.some((r) => r.date === '2026-10-16')).toBe(false);
        expect(all.conflicts).toEqual(['20261016_2000_西加航空.aac']);
    });

    it('drops foreign audio hosts and impossible dates', () => {
        expect(all.recordings.some((r) => r.showId === 'westair')).toBe(false);
    });

    it('reports show names it could not match', () => {
        expect(all.unmatched).toEqual(['口水多過浪花']);
    });
});

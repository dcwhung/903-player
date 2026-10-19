// @vitest-environment node
import { readFileSync } from 'node:fs';
import { parseAllRecordings, parseRecordings, readNextPageUrl } from './parseRecordings';

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

describe('readNextPageUrl', () => {
    const current = 'https://hkfm903.live/?show=%E5%85%AC%E5%AD%90%E6%9C%83';

    it('returns null when the page has no pagination', () => {
        expect(readNextPageUrl(fixture, current)).toBeNull();
    });

    it('follows a rel="next" link, resolved against the current url', () => {
        const html = `<nav><a rel="next" href="${current}&amp;page=2">Next</a></nav>`;

        expect(readNextPageUrl(html, current)).toBe(`${current}&page=2`);
    });

    it('follows the link after the active item in a .pagination list', () => {
        const html = `<ul class="pagination">
            <li class="page-item"><a class="page-link" href="/?page=1">1</a></li>
            <li class="page-item active"><span class="page-link">2</span></li>
            <li class="page-item"><a class="page-link" href="/?page=3">3</a></li>
        </ul>`;

        expect(readNextPageUrl(html, 'https://hkfm903.live/?page=2')).toBe(
            'https://hkfm903.live/?page=3',
        );
    });

    it('returns null when the active item is the last one', () => {
        const html = `<ul class="pagination">
            <li><a href="/p/1">1</a></li>
            <li class="active"><span>2</span></li>
        </ul>`;

        expect(readNextPageUrl(html, 'https://hkfm903.live/p/2')).toBeNull();
    });

    it('picks the lowest page= link above the current page', () => {
        const html = `<div>
            <a href="/?page=1">1</a>
            <a href="/?page=4">4</a>
            <a href="/?page=3">3</a>
            <a href="/?page=2">2</a>
        </div>`;

        expect(readNextPageUrl(html, 'https://hkfm903.live/?page=2')).toBe(
            'https://hkfm903.live/?page=3',
        );
    });

    it('treats a url without page= as page 1', () => {
        const html = `<a href="${current}&amp;page=1">1</a><a href="${current}&amp;page=2">2</a>`;

        expect(readNextPageUrl(html, current)).toBe(`${current}&page=2`);
    });

    it('rejects a cross-origin next link', () => {
        const html = '<a rel="next" href="https://evil.example/?page=2">Next</a>';

        expect(readNextPageUrl(html, current)).toBeNull();
    });

    it('rejects plain http and subdomains of the site', () => {
        const html = `<a href="http://hkfm903.live/?page=2">2</a>
            <a href="https://audio.hkfm903.live/?page=3">3</a>`;

        expect(readNextPageUrl(html, current)).toBeNull();
    });
});

describe('readNextPageUrl self-links', () => {
    const current = 'https://hkfm903.live/?page=1';

    it('returns null for a single-page Bootstrap pagination block', () => {
        const html = `<ul class="pagination">
            <li class="page-item active"><a class="page-link" href="#">1</a></li>
            <li class="page-item disabled"><a class="page-link" href="#">Next</a></li>
        </ul>`;

        expect(readNextPageUrl(html, current)).toBeNull();
    });

    it('returns null for rel="next" pointing at "#"', () => {
        expect(readNextPageUrl('<a rel="next" href="#">Next</a>', current)).toBeNull();
    });

    it('treats a link to the current page with a fragment as the same page', () => {
        const html = '<a rel="next" href="/?page=1#list">Next</a>';

        expect(readNextPageUrl(html, `${current}#top`)).toBeNull();
    });

    it('drops the fragment from a real next page', () => {
        const html = '<a rel="next" href="/?page=2#list">Next</a>';

        expect(readNextPageUrl(html, current)).toBe('https://hkfm903.live/?page=2');
    });
});

describe('readNextPageUrl stays on the same list', () => {
    const current = 'https://hkfm903.live/?show=%E5%85%AC%E5%AD%90%E6%9C%83';
    const otherShow = '/?show=%E5%85%B6%E4%BB%96&amp;page=2';

    it('rejects a page= link to a different show', () => {
        expect(readNextPageUrl(`<a href="${otherShow}">2</a>`, current)).toBeNull();
    });

    it('rejects rel="next" to a different show', () => {
        expect(readNextPageUrl(`<a rel="next" href="${otherShow}">Next</a>`, current)).toBeNull();
    });

    it('rejects a .pagination link to a different path', () => {
        const html = `<ul class="pagination">
            <li class="active"><span>1</span></li>
            <li><a href="/archive?show=%E5%85%AC%E5%AD%90%E6%9C%83&amp;page=2">2</a></li>
        </ul>`;

        expect(readNextPageUrl(html, current)).toBeNull();
    });

    it('accepts the same show with only the page changed, in any param order', () => {
        const html = '<a href="/?page=2&amp;show=%E5%85%AC%E5%AD%90%E6%9C%83">2</a>';

        expect(readNextPageUrl(html, current)).toBe(
            'https://hkfm903.live/?page=2&show=%E5%85%AC%E5%AD%90%E6%9C%83',
        );
    });
});

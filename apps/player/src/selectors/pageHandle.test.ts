import type { DramaEpisode } from '@903-player/catalog';
import { recording } from '../../tests/renderWithProviders';
import { dailyEpisodesOf, dramaEpisodeTheme, seriesEpisodesOf } from '../catalog/dramas';
import { themeFor } from '../catalog/shows';
import type { ClosedPlayerCard } from '../hooks/homePlayerCardClosed';
import { pageHandle, trackItem, type InnerPage, type PageHandleInput } from './pageHandle';

const TODAY = '2026-10-19';
const GONGZI = recording('gongzi', '2026-10-17');
const BADGIRL_TODAY = recording('badgirl', TODAY, '1000');
const CHISEE = seriesEpisodesOf('chisee')[0] as DramaEpisode;
const C18 = dailyEpisodesOf('c18')[0] as DramaEpisode;

const SHOW_PAGE: InnerPage = { kind: 'show', showId: 'gongzi' };
const DRAMA_PAGE: InnerPage = { kind: 'drama', dramaId: 'chisee' };
const TODAY_PAGE: InnerPage = { kind: 'today', date: TODAY };
// 星期日（2026-10-18）冇節目播，今日頁列最近有錄音嗰日（pickTodayDate）
const SUNDAY_FALLBACK_PAGE: InnerPage = { kind: 'today', date: '2026-10-17' };

const CLOSED_GONGZI: ClosedPlayerCard = {
    theme: themeFor('gongzi'),
    showName: '公子會',
    item: { kind: 'show', id: 'gongzi', date: '2026-10-17' },
};

const input = (overrides: Partial<PageHandleInput>): PageHandleInput => ({
    track: null,
    isPlaying: false,
    closed: null,
    page: SHOW_PAGE,
    ...overrides,
});

describe('trackItem', () => {
    it('should identify a show recording by show and date', () => {
        expect(trackItem(GONGZI)).toEqual({ kind: 'show', id: 'gongzi', date: '2026-10-17' });
    });

    it('should identify a drama episode by its drama', () => {
        expect(trackItem(CHISEE)).toEqual({ kind: 'drama', id: 'chisee' });
    });
});

describe('pageHandle', () => {
    it('should be null when nothing is loaded and no card was closed', () => {
        expect(pageHandle(input({}))).toBeNull();
    });

    it.each<[string, InnerPage, PageHandleInput['track']]>([
        ['the show page playing its own show', SHOW_PAGE, GONGZI],
        ['the drama page playing its own drama', DRAMA_PAGE, CHISEE],
        ['the today page playing a show of today', TODAY_PAGE, BADGIRL_TODAY],
    ])('should be null on %s', (_, page, track) => {
        expect(pageHandle(input({ page, track, isPlaying: true }))).toBeNull();
    });

    it('should show another playing show as playing, in its theme and name', () => {
        const handle = pageHandle(input({ page: DRAMA_PAGE, track: GONGZI, isPlaying: true }));
        expect(handle).toEqual({ theme: themeFor('gongzi'), name: '公子會', status: 'playing' });
    });

    it('should show another loaded drama as paused when it is not playing', () => {
        const handle = pageHandle(input({ track: C18, isPlaying: false }));
        expect(handle).toEqual({
            theme: dramaEpisodeTheme(C18),
            name: '18 樓 C 座',
            status: 'paused',
        });
    });

    it('should treat another drama on a drama page as not this page’s item', () => {
        expect(pageHandle(input({ page: DRAMA_PAGE, track: C18, isPlaying: true }))?.status).toBe(
            'playing',
        );
    });

    it('should treat an older episode on the today page as not this page’s item', () => {
        expect(pageHandle(input({ page: TODAY_PAGE, track: GONGZI }))?.name).toBe('公子會');
    });

    it('should be null on the today page listing a fallback day, playing a show of that day', () => {
        const handle = pageHandle(
            input({ page: SUNDAY_FALLBACK_PAGE, track: GONGZI, isPlaying: true }),
        );
        expect(handle).toBeNull();
    });

    it('should show a show of another day on the today page listing a fallback day', () => {
        const handle = pageHandle(input({ page: SUNDAY_FALLBACK_PAGE, track: BADGIRL_TODAY }));
        expect(handle?.name).toBe('Bad Girl大過佬');
    });

    it('should show a closed card as paused', () => {
        const handle = pageHandle(input({ page: DRAMA_PAGE, closed: CLOSED_GONGZI }));
        expect(handle).toEqual({ theme: themeFor('gongzi'), name: '公子會', status: 'paused' });
    });

    it('should be null for a closed card of this page’s own item', () => {
        expect(pageHandle(input({ closed: CLOSED_GONGZI }))).toBeNull();
    });

    it('should show a closed card whose item is unknown', () => {
        const closed = { theme: themeFor('gongzi'), showName: '公子會' };
        expect(pageHandle(input({ closed }))?.status).toBe('paused');
    });

    it('should prefer the loaded track over a closed card', () => {
        const handle = pageHandle(input({ track: C18, isPlaying: true, closed: CLOSED_GONGZI }));
        expect(handle?.name).toBe('18 樓 C 座');
    });
});

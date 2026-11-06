import { recording } from '../../../tests/renderWithProviders';
import { seriesEpisodesOf } from '../../catalog/dramas';
import { bookmarkOf, type Bookmark } from '../../services/bookmarkStore';
import type { SeriesEpisode } from '../../types/drama';
import {
    bookmarkLabel,
    bookmarkPage,
    bookmarkSpokenLabel,
    bookmarkTrack,
    isKnownBookmark,
    recentText,
    savedRowStatus,
    seriesName,
} from './savedItems';

const SHOW = recording('gongzi', '2026-10-17');
const SERIES = seriesEpisodesOf('chisee')[2] as SeriesEpisode;

describe('bookmarkTrack', () => {
    it('should rebuild a show recording from the bookmark even when the list no longer has it', () => {
        expect(bookmarkTrack(bookmarkOf(SHOW, 1), [])).toEqual(SHOW);
    });

    it('should prefer the recording / catalog episode with the same URL', () => {
        expect(bookmarkTrack(bookmarkOf(SHOW, 1), [SHOW])).toBe(SHOW);
        expect(bookmarkTrack(bookmarkOf(SERIES, 1), [])).toBe(SERIES);
    });
});

describe('bookmarkPage / bookmarkLabel', () => {
    it('should open the show page for a show and the drama page for a drama', () => {
        expect(bookmarkPage(bookmarkOf(SHOW, 1))).toEqual({
            path: '/show/gongzi',
            page: { kind: 'show', showId: 'gongzi' },
        });
        expect(bookmarkPage(bookmarkOf(SERIES, 1))).toEqual({
            path: '/drama/chisee',
            page: { kind: 'drama', dramaId: 'chisee' },
        });
    });

    it('should label shows by date and series dramas by episode number', () => {
        expect(bookmarkLabel(bookmarkOf(SHOW, 1))).toBe('17/10（六）');
        expect(bookmarkLabel(bookmarkOf(SERIES, 1))).toBe(`第 ${SERIES.no} 集`);
    });

    // A3：讀屏日子「17/10 星期六」，畫面照「17/10（六）」
    it('should read the date as 17/10 星期六 for screen readers', () => {
        expect(bookmarkSpokenLabel(bookmarkOf(SHOW, 1))).toBe('17/10 星期六');
        expect(bookmarkSpokenLabel(bookmarkOf(SERIES, 1))).toBe(`第 ${SERIES.no} 集`);
    });
});

// B3：短篇劇名經 i18n 砌（G2 分隔符）
describe('seriesName', () => {
    it('should join the drama title and the arc with the common separator', () => {
        expect(seriesName('芝See菇Bi Family', '三十六計')).toBe('芝See菇Bi Family · 三十六計');
    });
});

describe('recentText', () => {
    it('should show 17/10（六） but read 17/10 星期六', () => {
        expect(recentText(SHOW)).toEqual({
            name: '公子會',
            label: '17/10（六）',
            spokenLabel: '17/10 星期六',
        });
    });

    it('should keep the arc and episode for series dramas', () => {
        const label = `${SERIES.arc} · 第 ${SERIES.no} 集`;
        expect(recentText(SERIES)).toEqual({
            name: '芝See菇Bi Family',
            label,
            spokenLabel: label,
        });
    });
});

describe('isKnownBookmark', () => {
    it('should drop bookmarks of shows / dramas the app no longer has', () => {
        const gone: Bookmark = { ...bookmarkOf(SHOW, 1), showId: 'gone' } as Bookmark;

        expect(isKnownBookmark(bookmarkOf(SHOW, 1))).toBe(true);
        expect(isKnownBookmark(bookmarkOf(SERIES, 1))).toBe(true);
        expect(isKnownBookmark(gone)).toBe(false);
    });
});

describe('savedRowStatus', () => {
    const base = { loaded: false, isPlaying: false, live: undefined, progress: undefined };

    it('should say 播放中 while this episode plays', () => {
        const live = { currentTime: 60, duration: 600 };
        expect(savedRowStatus({ ...base, loaded: true, isPlaying: true, live })).toEqual({
            text: '播放中',
            ratio: 0.1,
            playing: true,
        });
    });

    it('should show where a paused loaded episode is', () => {
        const live = { currentTime: 190, duration: 570 };
        expect(savedRowStatus({ ...base, loaded: true, live })).toEqual({
            text: '聽到 3:10 / 9:30',
            ratio: 190 / 570,
            playing: false,
        });
    });

    it('should use saved progress otherwise: 聽到 / 已收聽 / 未收聽', () => {
        const progress = { position: 2, duration: 600, watched: false, updatedAt: 0 };
        expect(savedRowStatus({ ...base, progress }).text).toBe('聽到 0:02 / 10:00');
        expect(savedRowStatus({ ...base, progress: { ...progress, watched: true } })).toEqual({
            text: '已收聽',
            ratio: 1,
            playing: false,
        });
        expect(savedRowStatus(base)).toEqual({ text: '未收聽', ratio: 0, playing: false });
    });

    it('should leave out the total when the length was never known', () => {
        const progress = { position: 75, duration: 0, watched: false, updatedAt: 0 };
        expect(savedRowStatus({ ...base, progress }).text).toBe('聽到 1:15');
    });
});

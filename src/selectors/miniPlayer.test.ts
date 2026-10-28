import { recording } from '../../tests/renderWithProviders';
import { seriesEpisodesOf } from '../dramas';
import {
    miniPlayerRecordings,
    miniPlayerSubtitle,
    miniPlayerTags,
    miniPlayerTimeText,
} from './miniPlayer';

const BADGIRL = recording('badgirl', '2026-10-19', '1000');
const WANNI = recording('wanni', '2026-10-19', '1300');
const OLD = recording('badgirl', '2026-10-12', '1000');
const TODAY_LIST = [BADGIRL, WANNI];

describe('miniPlayerTimeText', () => {
    it('formats position and duration', () => {
        expect(miniPlayerTimeText(760, 7110)).toBe('12:40 / 1:58:30');
    });

    it('is undefined while the duration is unknown', () => {
        expect(miniPlayerTimeText(30, 0)).toBeUndefined();
    });
});

describe('miniPlayerSubtitle', () => {
    it('shows only the date, without 今日, and appends the time', () => {
        expect(miniPlayerSubtitle('2026-10-19', '12:40 / 1:58:30')).toBe(
            '19/10（一） · 12:40 / 1:58:30',
        );
    });

    it('shows only the date without time', () => {
        expect(miniPlayerSubtitle('2026-10-17')).toBe('17/10（六）');
    });
});

describe('miniPlayerRecordings', () => {
    it('puts a loaded older episode that is not listed first', () => {
        expect(miniPlayerRecordings(TODAY_LIST, OLD)).toEqual([OLD, BADGIRL, WANNI]);
    });

    it('keeps the list when the loaded episode is already listed', () => {
        expect(miniPlayerRecordings(TODAY_LIST, WANNI)).toBe(TODAY_LIST);
    });

    it('keeps the list when nothing is loaded', () => {
        expect(miniPlayerRecordings(TODAY_LIST, null)).toBe(TODAY_LIST);
    });

    it('keeps the list for a drama episode, which the mini player shows on its own', () => {
        const drama = seriesEpisodesOf('chisee')[0] ?? null;
        expect(miniPlayerRecordings(TODAY_LIST, drama)).toBe(TODAY_LIST);
    });

    it('puts an older episode before the latest-day fallback too', () => {
        const fallback = [recording('gongzi', '2026-10-17')];
        expect(miniPlayerRecordings(fallback, OLD)).toEqual([OLD, ...fallback]);
    });

    it('shows the older episode alone while nothing of today is up yet', () => {
        expect(miniPlayerRecordings([], OLD)).toEqual([OLD]);
    });
});

describe('miniPlayerTags', () => {
    it('tags the prepended episode 重溫 and today’s shows 今日', () => {
        expect(miniPlayerTags([OLD, BADGIRL, WANNI], true, '2026-10-19')).toEqual([
            'rewatch',
            'today',
            'today',
        ]);
    });

    it('tags only today’s shows when nothing is prepended', () => {
        expect(miniPlayerTags(TODAY_LIST, false, '2026-10-19')).toEqual(['today', 'today']);
    });

    it('leaves the latest-day fallback untagged, as it is not today', () => {
        const fallback = [recording('gongzi', '2026-10-17')];
        expect(miniPlayerTags(fallback, false, '2026-10-18')).toEqual([undefined]);
        expect(miniPlayerTags([OLD, ...fallback], true, '2026-10-18')).toEqual([
            'rewatch',
            undefined,
        ]);
    });
});

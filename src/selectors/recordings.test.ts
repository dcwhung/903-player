import type { Recording, ShowId } from '../types/recording';
import {
    episodesNewestFirst,
    isTodayRecording,
    pickInitialRecording,
    pickTodayDate,
    recordingsForShow,
    showsOnDate,
    todayRecordings,
} from './recordings';

const rec = (showId: ShowId, date: string, time = '2308'): Recording => ({
    showId,
    date,
    time,
    url: `https://audio.hkfm903.live/${showId}/${date}_${time}.aac`,
});

const all: Recording[] = [
    rec('gongzi', '2026-10-17'),
    rec('badgirl', '2026-10-16', '1000'),
    rec('gongzi', '2026-10-10'),
    rec('wanni', '2026-10-16', '1300'),
    rec('badgirl', '2026-10-19', '1000'),
    rec('sunnyday', '2026-10-16', '0600'),
];

describe('recordingsForShow', () => {
    it('returns only that show, oldest first', () => {
        expect(recordingsForShow(all, 'gongzi').map((r) => r.date)).toEqual([
            '2026-10-10',
            '2026-10-17',
        ]);
    });
});

describe('pickInitialRecording', () => {
    const gongzi = recordingsForShow(all, 'gongzi');

    it('picks today when there is a recording today', () => {
        expect(pickInitialRecording(gongzi, '2026-10-17')?.date).toBe('2026-10-17');
    });

    it('falls back to the latest earlier recording', () => {
        expect(pickInitialRecording(gongzi, '2026-10-19')?.date).toBe('2026-10-17');
        expect(pickInitialRecording(gongzi, '2026-10-15')?.date).toBe('2026-10-10');
    });

    it('returns the oldest when every recording is after today', () => {
        expect(pickInitialRecording(gongzi, '2026-10-01')?.date).toBe('2026-10-10');
    });

    it('returns undefined for an empty list', () => {
        expect(pickInitialRecording([], '2026-10-19')).toBeUndefined();
    });
});

describe('pickTodayDate', () => {
    it('uses today when something aired today', () => {
        expect(pickTodayDate(all, '2026-10-19')).toBe('2026-10-19');
    });

    it('falls back to the latest earlier date with recordings', () => {
        expect(pickTodayDate(all, '2026-10-18')).toBe('2026-10-17');
    });

    it('returns undefined when there are no recordings', () => {
        expect(pickTodayDate([], '2026-10-19')).toBeUndefined();
    });
});

describe('showsOnDate', () => {
    it('lists recordings of that date in broadcast order', () => {
        expect(showsOnDate(all, '2026-10-16').map((r) => r.showId)).toEqual([
            'sunnyday',
            'badgirl',
            'wanni',
        ]);
    });
});

describe('todayRecordings', () => {
    it('lists today (or the latest day) in broadcast order', () => {
        expect(todayRecordings(all, '2026-10-19').map((r) => r.showId)).toEqual(['badgirl']);
        expect(todayRecordings(all, '2026-10-16').map((r) => r.showId)).toEqual([
            'sunnyday',
            'badgirl',
            'wanni',
        ]);
        expect(todayRecordings([], '2026-10-19')).toEqual([]);
    });
});

describe('episodesNewestFirst', () => {
    it('orders a show newest first', () => {
        expect(episodesNewestFirst(all, 'gongzi').map((r) => r.date)).toEqual([
            '2026-10-17',
            '2026-10-10',
        ]);
    });
});

describe('isTodayRecording', () => {
    it('compares against the Hong Kong date', () => {
        expect(isTodayRecording(rec('gongzi', '2026-10-19'), '2026-10-19')).toBe(true);
        expect(isTodayRecording(rec('gongzi', '2026-10-17'), '2026-10-19')).toBe(false);
        expect(isTodayRecording(null, '2026-10-19')).toBe(false);
    });
});

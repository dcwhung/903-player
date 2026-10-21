import type { Recording, ShowId, UnavailableEpisode } from '../types/recording';
import {
    entriesNewestFirst,
    entriesOnDate,
    episodesNewestFirst,
    isAvailable,
    newShowIds,
    pickInitialRecording,
    pickTodayDate,
    recordingsForShow,
    showsOnDate,
    todayRecordings,
    unavailableForShow,
    unavailableOnDate,
} from './recordings';

const rec = (showId: ShowId, date: string, time = '2308'): Recording => ({
    showId,
    date,
    time,
    url: `https://audio.hkfm903.live/${showId}/${date}_${time}.aac`,
});

const missing = (showId: ShowId, date: string, time = '2308'): UnavailableEpisode => ({
    showId,
    date,
    time,
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

    it('uses today when today only has unavailable episodes', () => {
        expect(pickTodayDate(all, '2026-10-20', [missing('wanni', '2026-10-20')])).toBe(
            '2026-10-20',
        );
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

    it('is empty when today only has unavailable episodes, instead of falling back', () => {
        expect(todayRecordings(all, '2026-10-20', [missing('wanni', '2026-10-20')])).toEqual([]);
    });
});

describe('unavailableForShow', () => {
    it('lists that show only, skipping episodes that have since been found', () => {
        const unavailable = [
            missing('badgirl', '2026-10-20', '1000'),
            missing('badgirl', '2026-10-19', '1000'),
            missing('wanni', '2026-10-20', '1300'),
        ];

        expect(unavailableForShow(unavailable, all, 'badgirl')).toEqual([
            missing('badgirl', '2026-10-20', '1000'),
        ]);
    });
});

describe('unavailableOnDate', () => {
    it('lists that date in broadcast order, skipping episodes that have since been found', () => {
        const unavailable = [
            missing('lalala', '2026-10-16', '1710'),
            missing('wanni', '2026-10-16', '1300'),
            missing('waves', '2026-10-16', '1510'),
            missing('waves', '2026-10-15', '1510'),
        ];

        expect(unavailableOnDate(unavailable, all, '2026-10-16').map((u) => u.showId)).toEqual([
            'waves',
            'lalala',
        ]);
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

describe('entriesNewestFirst', () => {
    it("merges a show's recordings with its unavailable episodes, newest first", () => {
        const unavailable = [missing('gongzi', '2026-10-24'), missing('gongzi', '2026-10-17')];

        expect(entriesNewestFirst(all, unavailable, 'gongzi')).toEqual([
            missing('gongzi', '2026-10-24'),
            rec('gongzi', '2026-10-17'),
            rec('gongzi', '2026-10-10'),
        ]);
    });
});

describe('entriesOnDate', () => {
    it("merges that date's recordings with its unavailable episodes in broadcast order", () => {
        const unavailable = [
            missing('waves', '2026-10-16', '1510'),
            missing('wanni', '2026-10-16', '1300'),
        ];

        expect(entriesOnDate(all, unavailable, '2026-10-16')).toEqual([
            rec('sunnyday', '2026-10-16', '0600'),
            rec('badgirl', '2026-10-16', '1000'),
            rec('wanni', '2026-10-16', '1300'),
            missing('waves', '2026-10-16', '1510'),
        ]);
    });
});

describe('isAvailable', () => {
    it('tells recordings apart from unavailable episodes', () => {
        expect(isAvailable(rec('gongzi', '2026-10-17'))).toBe(true);
        expect(isAvailable(missing('gongzi', '2026-10-17'))).toBe(false);
    });
});

describe('newShowIds', () => {
    it('lists shows with a recording today that is not watched yet', () => {
        const watched = new Set([rec('wanni', '2026-10-16', '1300').url]);

        expect(newShowIds(all, '2026-10-16', watched)).toEqual(new Set(['badgirl', 'sunnyday']));
    });

    it('is empty when nothing is up today', () => {
        expect(newShowIds(all, '2026-10-18', new Set())).toEqual(new Set());
    });
});

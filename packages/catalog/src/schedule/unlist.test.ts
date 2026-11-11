import { readEpisodeDates, readEpisodeRemovals } from '../dramas/availabilitySchema';
import {
    expandSchedule,
    parseScheduleRule,
    planSchedule,
    ScheduleError,
    unlistOf,
    type ScheduleRule,
} from './expandSchedule';

const CTX = { id: 'test', source: 'test', files: new Set<string>() };

/** 展開結果要過 drama.json 同一套上架 / 下架 validator */
const expectValid = (expanded: ReturnType<typeof expandSchedule>, count: number) => {
    const arc = { path: 'arcs[0]', range: { first: 1, last: count }, addedAt: expanded.addedAt };
    const episodeDates = readEpisodeDates(CTX, { episodeDates: expanded.episodeDates }, arc);
    const removals = { episodeRemovedAt: expanded.episodeRemovedAt };
    readEpisodeRemovals(CTX, removals, { ...arc, episodeDates, removedAt: undefined });
};

const SPAN = (count: number) => ({ firstNo: 1, count });

/** mockup ⑧：由 16/11（一）起逢一上架 5 集，30 集 → 16/11、23/11 … 21/12 */
const MONDAYS: ScheduleRule = {
    kind: 'periodic',
    start: '2026-11-16',
    perRelease: 5,
    every: { weekdays: [1] },
};

/** 全部一次過上架（27/10） */
const ALL_LISTED: ScheduleRule = { kind: 'dates', batches: [{ from: 1, date: '2026-10-27' }] };

describe('expandSchedule — unlist on a date', () => {
    it('should remove every episode on the same day', () => {
        const expanded = expandSchedule(
            { ...ALL_LISTED, unlist: { kind: 'date', date: '2026-12-31' } },
            SPAN(30),
        );
        expect(expanded).toEqual({
            addedAt: '2026-10-27',
            episodeDates: {},
            episodeRemovedAt: { '1-30': '2026-12-31' },
        });
        expectValid(expanded, 30);
    });

    it('should reject a date that does not exist', () => {
        expect(() =>
            expandSchedule(
                { ...ALL_LISTED, unlist: { kind: 'date', date: '2026-02-30' } },
                SPAN(3),
            ),
        ).toThrow(/unlist.date/);
    });
});

describe('expandSchedule — unlist N days after each listing', () => {
    it('should count from each episode’s own listing date (same as removeAfterDays)', () => {
        const expanded = expandSchedule(
            { ...MONDAYS, unlist: { kind: 'afterDays', days: 28 } },
            SPAN(12),
        );
        expect(expanded.episodeRemovedAt).toEqual({
            '1-5': '2026-12-14',
            '6-10': '2026-12-21',
            '11-12': '2026-12-28',
        });
        expectValid(expanded, 12);
    });

    it('should read the old removeAfterDays as afterDays (backwards compatible)', () => {
        const legacy: ScheduleRule = { ...MONDAYS, removeAfterDays: 28 };
        expect(unlistOf(legacy)).toEqual({ kind: 'afterDays', days: 28 });
        expect(expandSchedule(legacy, SPAN(12))).toEqual(
            expandSchedule({ ...MONDAYS, unlist: { kind: 'afterDays', days: 28 } }, SPAN(12)),
        );
    });

    it.each([0, 1.5, 3661])('should reject %s days', (days) => {
        expect(() =>
            expandSchedule({ ...MONDAYS, unlist: { kind: 'afterDays', days } }, SPAN(5)),
        ).toThrow(ScheduleError);
    });
});

describe('expandSchedule — unlist periodically', () => {
    it('should unlist perRelease episodes on each cadence day from episode 1 (mockup ⑧ ⑨)', () => {
        const rule: ScheduleRule = {
            ...MONDAYS,
            unlist: {
                kind: 'periodic',
                start: '2026-12-14',
                perRelease: 6,
                every: { weekdays: [1] },
            },
        };
        const expanded = expandSchedule(rule, SPAN(30));
        expect(expanded.episodeRemovedAt).toEqual({
            '1-6': '2026-12-14',
            '7-12': '2026-12-21',
            '13-18': '2026-12-28',
            '19-24': '2027-01-04',
            '25-30': '2027-01-11',
        });
        expectValid(expanded, 30);
    });

    it('should support every N days and a smaller last batch', () => {
        const rule: ScheduleRule = {
            ...ALL_LISTED,
            unlist: { kind: 'periodic', start: '2026-12-01', perRelease: 4, every: { days: 2 } },
        };
        expect(expandSchedule(rule, SPAN(10)).episodeRemovedAt).toEqual({
            '1-4': '2026-12-01',
            '5-8': '2026-12-03',
            '9-10': '2026-12-05',
        });
    });

    it.each([
        ['perRelease 0', { perRelease: 0 }],
        ['no weekdays', { every: { weekdays: [] } }],
        ['a bad start', { start: '2026-13-01' }],
    ])('should reject %s', (_, change) => {
        const unlist = {
            kind: 'periodic',
            start: '2026-12-01',
            perRelease: 1,
            every: { days: 1 },
            ...change,
        };
        expect(() => expandSchedule({ ...ALL_LISTED, unlist } as ScheduleRule, SPAN(3))).toThrow(
            ScheduleError,
        );
    });
});

describe('expandSchedule — episodes already unlisted (mockup ⑤)', () => {
    it('should keep past removals and only schedule the other episodes', () => {
        const rule: ScheduleRule = {
            ...ALL_LISTED,
            unlisted: { '1-10': '2026-11-04' },
            unlist: { kind: 'date', date: '2026-12-31' },
        };
        expect(expandSchedule(rule, SPAN(30)).episodeRemovedAt).toEqual({
            '1-10': '2026-11-04',
            '11-30': '2026-12-31',
        });
    });

    it('should start a periodic unlist at the first episode still listed', () => {
        const rule: ScheduleRule = {
            ...ALL_LISTED,
            unlisted: { '1-2': '2026-11-04' },
            unlist: { kind: 'periodic', start: '2026-12-07', perRelease: 2, every: { days: 7 } },
        };
        expect(expandSchedule(rule, SPAN(5)).episodeRemovedAt).toEqual({
            '1-2': '2026-11-04',
            '3-4': '2026-12-07',
            5: '2026-12-14',
        });
    });

    it('should keep past removals even without a new unlist', () => {
        const rule: ScheduleRule = { ...ALL_LISTED, unlisted: { 1: '2026-11-04' } };
        expect(expandSchedule(rule, SPAN(3)).episodeRemovedAt).toEqual({ 1: '2026-11-04' });
    });

    it.each([
        ['a bad key', { x: '2026-11-04' }],
        ['a range outside the arc', { '1-40': '2026-11-04' }],
        ['overlapping ranges', { '1-3': '2026-11-04', '3-4': '2026-11-05' }],
        ['a bad date', { 1: '2026-11-31' }],
    ])('should reject %s', (_, unlisted) => {
        expect(() => expandSchedule({ ...ALL_LISTED, unlisted }, SPAN(5))).toThrow(ScheduleError);
    });
});

describe('expandSchedule — unlist date not after the listing date', () => {
    it('should reject an episode unlisted on or before its own listing day', () => {
        // 第 6 集 23/11 上架；逢一每次下架 6 集由 16/11 起 → 第 6 集 16/11 下架（早過上架）
        const rule: ScheduleRule = {
            ...MONDAYS,
            unlist: {
                kind: 'periodic',
                start: '2026-11-16',
                perRelease: 6,
                every: { weekdays: [1] },
            },
        };
        expect(() => expandSchedule(rule, SPAN(30))).toThrow(
            'episode 6 unlist date 2026-11-16 must be later than its listing date 2026-11-23',
        );
    });

    it('should reject an unlist date on the listing day itself', () => {
        expect(() =>
            expandSchedule(
                { ...ALL_LISTED, unlist: { kind: 'date', date: '2026-10-27' } },
                SPAN(2),
            ),
        ).toThrow(
            'episode 1 unlist date 2026-10-27 must be later than its listing date 2026-10-27',
        );
    });
});

describe('planSchedule', () => {
    it('should list each episode with its listing and unlist dates, conflicts included', () => {
        const plan = planSchedule(
            { ...MONDAYS, unlist: { kind: 'date', date: '2026-11-20' } },
            SPAN(7),
        );
        expect(plan.batches).toEqual([
            { first: 1, last: 5, date: '2026-11-16' },
            { first: 6, last: 7, date: '2026-11-23' },
        ]);
        expect(plan.episodes[0]).toEqual({
            no: 1,
            listedAt: '2026-11-16',
            removedAt: '2026-11-20',
        });
        expect(plan.episodes[6]).toEqual({
            no: 7,
            listedAt: '2026-11-23',
            removedAt: '2026-11-20',
        });
        expect(plan.conflicts.map((e) => e.no)).toEqual([6, 7]);
    });

    it('should leave removedAt out when there is no unlist', () => {
        expect(planSchedule(MONDAYS, SPAN(1)).episodes).toEqual([
            { no: 1, listedAt: '2026-11-16' },
        ]);
    });
});

describe('expandSchedule — listed batches kept before a periodic rule', () => {
    /** 第 1–15 集已上架（26/10、2/11、9/11 各 5 集），第 16 集起由 7/12 逢一上架 5 集 */
    const rule: ScheduleRule = {
        kind: 'periodic',
        start: '2026-12-07',
        perRelease: 5,
        every: { weekdays: [1] },
        from: 16,
        listed: [
            { from: 1, date: '2026-10-26' },
            { from: 6, date: '2026-11-02' },
            { from: 11, date: '2026-11-09' },
        ],
    };

    it('should keep the listed batches as they are and list the rest periodically', () => {
        const expanded = expandSchedule(rule, SPAN(30));
        expect(expanded).toEqual({
            addedAt: '2026-10-26',
            episodeDates: {
                6: '2026-11-02',
                11: '2026-11-09',
                16: '2026-12-07',
                21: '2026-12-14',
                26: '2026-12-21',
            },
            episodeRemovedAt: {},
        });
        expectValid(expanded, 30);
    });

    it.each([
        ['from without listed', { listed: undefined }],
        ['listed without from', { from: undefined }],
        ['from at the first episode', { from: 1 }],
        ['from after the last episode', { from: 31 }],
        ['listed not starting at the first episode', { listed: [{ from: 2, date: '2026-10-26' }] }],
        [
            'a listed batch at or after from',
            {
                listed: [
                    { from: 1, date: '2026-10-26' },
                    { from: 16, date: '2026-11-02' },
                ],
            },
        ],
        ['a periodic start not after the listed batches', { start: '2026-11-09' }],
    ])('should reject %s', (_, change) => {
        expect(() => expandSchedule({ ...rule, ...change } as ScheduleRule, SPAN(30))).toThrow(
            ScheduleError,
        );
    });
});

describe('parseScheduleRule — unlisting', () => {
    it.each([
        { ...ALL_LISTED, unlist: { kind: 'date', date: '2026-12-31' } },
        { ...ALL_LISTED, unlist: { kind: 'afterDays', days: 30 } },
        {
            ...MONDAYS,
            unlist: { kind: 'periodic', start: '2026-12-14', perRelease: 6, every: { days: 7 } },
            unlisted: { '1-5': '2026-11-04' },
        },
        { ...MONDAYS, from: 6, listed: [{ from: 1, date: '2026-11-02' }] },
    ])('should accept %j', (rule) => {
        expect(parseScheduleRule(rule)).toEqual(rule);
    });

    it.each([
        ['an unknown unlist kind', { ...ALL_LISTED, unlist: { kind: 'never' } }],
        ['unlist date not a string', { ...ALL_LISTED, unlist: { kind: 'date', date: 1 } }],
        ['unlist with extra keys', { ...ALL_LISTED, unlist: { kind: 'afterDays', days: 3, x: 1 } }],
        [
            'unlist periodic without every',
            { ...ALL_LISTED, unlist: { kind: 'periodic', start: '2026-12-01', perRelease: 1 } },
        ],
        [
            'both unlist and removeAfterDays',
            { ...ALL_LISTED, unlist: { kind: 'afterDays', days: 3 }, removeAfterDays: 3 },
        ],
        ['unlisted not a record of dates', { ...ALL_LISTED, unlisted: { 1: 5 } }],
        ['listed on a dates rule', { ...ALL_LISTED, listed: [] }],
        ['listed not a list', { ...MONDAYS, from: 6, listed: {} }],
        ['from not a number', { ...MONDAYS, from: '6', listed: [] }],
    ])('should reject %s', (_, value) => {
        expect(() => parseScheduleRule(value)).toThrow(ScheduleError);
    });
});

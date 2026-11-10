import { readEpisodeDates, readEpisodeRemovals } from '../dramas/availabilitySchema';
import {
    expandSchedule,
    parseScheduleRule,
    ScheduleError,
    type ScheduleRule,
} from './expandSchedule';

const CTX = { id: 'test', source: 'test', files: new Set<string>() };

/** 展開結果要過 drama.json 同一套上架 / 下架 validator */
const expectValid = (
    expanded: ReturnType<typeof expandSchedule>,
    { firstNo, count }: { firstNo: number; count: number },
) => {
    const range = { first: firstNo, last: firstNo + count - 1 };
    const arc = { path: 'arcs[0]', range, addedAt: expanded.addedAt };
    const episodeDates = readEpisodeDates(CTX, { episodeDates: expanded.episodeDates }, arc);
    const removals = { episodeRemovedAt: expanded.episodeRemovedAt };
    readEpisodeRemovals(CTX, removals, { ...arc, episodeDates, removedAt: undefined });
};

const expand = (rule: ScheduleRule, count: number | undefined, firstNo = 1) =>
    expandSchedule(rule, { firstNo, count });

const weekly = (start: string, perRelease: number): ScheduleRule => ({
    kind: 'periodic',
    start,
    perRelease,
    every: { days: 7 },
});

describe('expandSchedule — periodic', () => {
    it('should release perRelease episodes every N days, crossing months and years', () => {
        const expanded = expand(weekly('2026-12-25', 2), 6);
        expect(expanded).toEqual({
            addedAt: '2026-12-25',
            episodeDates: { 3: '2027-01-01', 5: '2027-01-08' },
            episodeRemovedAt: {},
        });
        expectValid(expanded, { firstNo: 1, count: 6 });
    });

    it('should land on 29 February in a leap year and skip it otherwise', () => {
        expect(expand(weekly('2028-02-22', 1), 2).episodeDates).toEqual({ 2: '2028-02-29' });
        expect(expand(weekly('2027-02-22', 1), 2).episodeDates).toEqual({ 2: '2027-03-01' });
    });

    it('should release on several weekdays each week, starting on or after start', () => {
        // 2026-11-10 係星期二：第一個合規嘅日子係星期三 11-11
        const rule: ScheduleRule = {
            kind: 'periodic',
            start: '2026-11-10',
            perRelease: 1,
            every: { weekdays: [1, 3, 5] },
        };
        const expanded = expand(rule, 4);
        expect(expanded.addedAt).toBe('2026-11-11');
        expect(expanded.episodeDates).toEqual({
            2: '2026-11-13',
            3: '2026-11-16',
            4: '2026-11-18',
        });
        expectValid(expanded, { firstNo: 1, count: 4 });
    });

    it('should put the remainder in a smaller last batch', () => {
        const expanded = expand(weekly('2026-11-01', 4), 10);
        expect(expanded.episodeDates).toEqual({ 5: '2026-11-08', 9: '2026-11-15' });
    });

    it('should release everything at once when perRelease is larger than count', () => {
        expect(expand(weekly('2026-11-01', 20), 10)).toEqual({
            addedAt: '2026-11-01',
            episodeDates: {},
            episodeRemovedAt: {},
        });
    });

    it('should count batches from firstNo (episode 0 prequels)', () => {
        const expanded = expand(weekly('2026-11-01', 2), 4, 0);
        expect(expanded.episodeDates).toEqual({ 2: '2026-11-08' });
        expectValid(expanded, { firstNo: 0, count: 4 });
    });
});

describe('expandSchedule — dates', () => {
    const rule = (batches: { from: number; date: string }[]): ScheduleRule => ({
        kind: 'dates',
        batches,
    });

    it('should use the first batch as addedAt and the rest as episodeDates', () => {
        const expanded = expand(
            rule([
                { from: 1, date: '2026-11-01' },
                { from: 4, date: '2026-11-20' },
            ]),
            6,
        );
        expect(expanded).toEqual({
            addedAt: '2026-11-01',
            episodeDates: { 4: '2026-11-20' },
            episodeRemovedAt: {},
        });
        expectValid(expanded, { firstNo: 1, count: 6 });
    });

    it.each([
        ['the first batch is not the first episode', [{ from: 2, date: '2026-11-01' }]],
        [
            'batches are out of order',
            [
                { from: 1, date: '2026-11-01' },
                { from: 5, date: '2026-11-08' },
                { from: 3, date: '2026-11-15' },
            ],
        ],
        [
            'a batch starts after the last episode',
            [
                { from: 1, date: '2026-11-01' },
                { from: 7, date: '2026-11-08' },
            ],
        ],
        [
            'dates do not increase',
            [
                { from: 1, date: '2026-11-08' },
                { from: 3, date: '2026-11-08' },
            ],
        ],
        ['a date does not exist', [{ from: 1, date: '2026-02-30' }]],
        ['there are no batches', []],
    ])('should reject when %s', (_, batches) => {
        expect(() => expand(rule(batches), 6)).toThrow(ScheduleError);
    });
});

describe('expandSchedule — removeAfterDays', () => {
    it('should remove each batch N days after its own release', () => {
        const expanded = expand({ ...weekly('2026-11-01', 2), removeAfterDays: 30 }, 5);
        expect(expanded.episodeRemovedAt).toEqual({
            '1-2': '2026-12-01',
            '3-4': '2026-12-08',
            5: '2026-12-15',
        });
        expectValid(expanded, { firstNo: 1, count: 5 });
    });

    it('should accept removal one day after release (the earliest valid day)', () => {
        const expanded = expand({ ...weekly('2026-11-01', 1), removeAfterDays: 1 }, 1);
        expect(expanded.episodeRemovedAt).toEqual({ 1: '2026-11-02' });
        expectValid(expanded, { firstNo: 1, count: 1 });
    });

    it.each([0, -1, 1.5])('should reject removeAfterDays %s', (days) => {
        expect(() => expand({ ...weekly('2026-11-01', 1), removeAfterDays: days }, 2)).toThrow(
            ScheduleError,
        );
    });
});

describe('expandSchedule — rejected input', () => {
    it('should reject an arc whose episode count is not known yet', () => {
        expect(() => expand(weekly('2026-11-01', 1), undefined)).toThrow(/episode count/);
    });

    it.each([
        ['perRelease 0', { ...weekly('2026-11-01', 0) }],
        ['every 0 days', { ...weekly('2026-11-01', 1), every: { days: 0 } }],
        ['no weekdays', { ...weekly('2026-11-01', 1), every: { weekdays: [] } }],
        ['weekday 7', { ...weekly('2026-11-01', 1), every: { weekdays: [7] } }],
        ['a bad start date', { ...weekly('2026-13-01', 1) }],
    ])('should reject %s', (_, rule) => {
        expect(() => expand(rule as ScheduleRule, 3)).toThrow(ScheduleError);
    });
});

describe('expandSchedule — day limits (W-704)', () => {
    it.each([
        ['every.days', { ...weekly('2026-11-01', 1), every: { days: 100_000_000 } }],
        ['removeAfterDays', { ...weekly('2026-11-01', 1), removeAfterDays: 1e9 }],
        ['every.days just over the limit', { ...weekly('2026-11-01', 1), every: { days: 3661 } }],
    ])('should reject a huge %s with ScheduleError, not RangeError', (_, rule) => {
        expect(() => expand(rule as ScheduleRule, 3)).toThrow(ScheduleError);
    });

    it('should accept the limit itself', () => {
        const expanded = expand({ ...weekly('2026-11-01', 1), removeAfterDays: 3660 }, 1);
        expect(expanded.episodeRemovedAt).toEqual({ 1: '2036-11-08' });
    });
});

describe('parseScheduleRule', () => {
    it('should accept a well-formed rule and return it unchanged', () => {
        const rule = { ...weekly('2026-11-01', 2), removeAfterDays: 30 };
        expect(parseScheduleRule(rule)).toEqual(rule);
    });

    it.each([
        ['not an object', 'weekly'],
        ['an unknown kind', { kind: 'monthly' }],
        ['periodic without every', { kind: 'periodic', start: '2026-11-01', perRelease: 1 }],
        [
            'every with both days and weekdays',
            { ...weekly('2026-11-01', 1), every: { days: 1, weekdays: [1] } },
        ],
        ['dates without batches', { kind: 'dates' }],
        ['a batch without a date', { kind: 'dates', batches: [{ from: 1 }] }],
        ['unknown keys', { ...weekly('2026-11-01', 1), extra: true }],
    ])('should reject %s', (_, value) => {
        expect(() => parseScheduleRule(value)).toThrow(ScheduleError);
    });
});

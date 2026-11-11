import { planSchedule, type ScheduleRule } from '@903-player/catalog';
import type { ScheduleContext } from './scheduleModel';
import {
    cellsOf,
    doneText,
    episodeTip,
    listingScopeText,
    listingTimeline,
    previewDays,
    progressText,
    unlistScopeText,
    unlistTimeline,
} from './timelineModel';

const TODAY = '2026-12-01';

/** mockup ⑧（今日 1/12）：第 1–15 集已上架，第 16 集起由 7/12 逢一上架 5 集，由 14/12 起逢一下架 6 集 */
const CONTEXT: ScheduleContext = {
    firstNo: 1,
    count: 30,
    today: TODAY,
    unlisted: {},
    listed: [
        { first: 1, last: 5, date: '2026-10-26' },
        { first: 6, last: 10, date: '2026-11-02' },
        { first: 11, last: 15, date: '2026-11-09' },
    ],
};

const RULE: ScheduleRule = {
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
    unlist: { kind: 'periodic', start: '2026-12-14', perRelease: 6, every: { weekdays: [1] } },
};

const PLAN = planSchedule(RULE, { firstNo: 1, count: 30 });

describe('timelineModel — scope texts (mockup ⑧)', () => {
    it('should describe what each panel can schedule', () => {
        expect(listingScopeText(CONTEXT)).toBe('可上架：第 16–30 集（共 15 集）');
        expect(unlistScopeText(CONTEXT)).toBe(
            '可下架：第 1–15 集（已上架）· 第 16–30 集（已排程上架）',
        );
        expect(progressText(CONTEXT)).toBe('第 1–15 集已上架 · 第 16–30 集已排程上架');
    });

    it('should leave out episodes already unlisted and empty parts', () => {
        const done = {
            ...CONTEXT,
            listed: [{ first: 1, last: 30, date: '2026-10-27' }],
            unlisted: { '1-10': '2026-11-04' },
        };
        expect(unlistScopeText(done)).toBe('可下架：第 11–30 集（已上架）');
        expect(progressText(done)).toBe('第 1–30 集已上架');
        expect(doneText(done)).toBe('✓ 已全部上架（27/10 二 · 第 1–30 集）');
        const fresh = { ...CONTEXT, listed: [] };
        expect(unlistScopeText(fresh)).toBe('可下架：第 1–30 集（已排程上架）');
    });
});

describe('timelineModel — edit timelines', () => {
    it('should show the listed part as one grey group and each planned batch', () => {
        expect(listingTimeline(PLAN, CONTEXT)).toEqual({
            listed: { first: 1, last: 15 },
            planned: [
                { first: 16, last: 20, date: '2026-12-07' },
                { first: 21, last: 25, date: '2026-12-14' },
                { first: 26, last: 30, date: '2026-12-21' },
            ],
        });
    });

    it('should group removals by day, past removals apart (mockup ⑤)', () => {
        expect(unlistTimeline(PLAN, CONTEXT).planned).toEqual([
            { first: 1, last: 6, date: '2026-12-14' },
            { first: 7, last: 12, date: '2026-12-21' },
            { first: 13, last: 18, date: '2026-12-28' },
            { first: 19, last: 24, date: '2027-01-04' },
            { first: 25, last: 30, date: '2027-01-11' },
        ]);
        const kept = planSchedule(
            {
                kind: 'dates',
                batches: [{ from: 1, date: '2026-10-27' }],
                unlisted: { '1-10': '2026-11-04' },
                unlist: { kind: 'date', date: '2026-12-31' },
            },
            { firstNo: 1, count: 30 },
        );
        expect(unlistTimeline(kept, CONTEXT)).toEqual({
            removed: [{ first: 1, last: 10, date: '2026-11-04' }],
            planned: [{ first: 11, last: 30, date: '2026-12-31' }],
        });
    });

    it('should squeeze long groups into first … last', () => {
        expect(cellsOf({ first: 16, last: 20 })).toEqual([16, null, 20]);
        expect(cellsOf({ first: 1, last: 3 })).toEqual([1, 2, 3]);
        expect(cellsOf({ first: 6, last: 6 })).toEqual([6]);
    });
});

describe('timelineModel — preview (mockup ⑨)', () => {
    it('should merge listings and removals into one day per date after today', () => {
        const days = previewDays(PLAN, TODAY);
        expect(days.map((d) => d.date)).toEqual([
            '2026-12-07',
            '2026-12-14',
            '2026-12-21',
            '2026-12-28',
            '2027-01-04',
            '2027-01-11',
        ]);
        expect(days[1]).toEqual({
            date: '2026-12-14',
            listings: [{ first: 21, last: 25, date: '2026-12-14' }],
            removals: [{ first: 1, last: 6, date: '2026-12-14' }],
        });
        expect(days[3]?.listings).toEqual([]);
    });

    it('should explain one episode in its tooltip', () => {
        expect(episodeTip({ no: 6, listedAt: '2026-11-23', removedAt: '2026-12-14' })).toBe(
            '第 6 集：23/11 上架，14/12 下架，共 21 日',
        );
        expect(episodeTip({ no: 6, listedAt: '2026-11-23' })).toBe('第 6 集：23/11 上架，不下架');
    });
});

import { planSchedule, type ScheduleRule } from '@903-player/catalog';
import type { ScheduleContext } from './scheduleModel';
import {
    cellsOf,
    doneText,
    episodeTip,
    listingScopeText,
    listingStrip,
    listingTimeline,
    previewDays,
    progressText,
    unlistScopeText,
    unlistStrip,
    unlistTimeline,
    withToday,
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
        expect(unlistTimeline(kept, { ...CONTEXT, unlisted: { '1-10': '2026-11-04' } })).toEqual({
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

describe('timelineModel — 今日 (用戶 2026-11-12)', () => {
    const items = ['2026-12-07', '2026-12-14', '2026-12-21'];
    const mark = (today: string) =>
        withToday(items, (date) => date, today).map((m) =>
            m.kind === 'today' ? `today:${m.date}` : `${m.item}${m.isToday ? '*' : ''}`,
        );

    it('should insert a 今日 cell at its place when today is not a batch date', () => {
        expect(mark('2026-12-10')).toEqual([
            '2026-12-07',
            'today:2026-12-10',
            '2026-12-14',
            '2026-12-21',
        ]);
    });

    it('should put 今日 first when today is before every batch', () => {
        expect(mark('2026-12-01')[0]).toBe('today:2026-12-01');
        expect(mark('2026-12-01')).toHaveLength(4);
    });

    it('should put 今日 last when today is after every batch', () => {
        expect(mark('2027-01-01').at(-1)).toBe('today:2027-01-01');
    });

    it('should mark the batch instead of adding a cell when today is a batch date', () => {
        expect(mark('2026-12-07')).toEqual(['2026-12-07*', '2026-12-14', '2026-12-21']);
        expect(mark('2026-12-21')).toEqual(['2026-12-07', '2026-12-14', '2026-12-21*']);
        expect(mark('2026-12-14')).toEqual(['2026-12-07', '2026-12-14*', '2026-12-21']);
    });

    it('should give a 今日 cell alone when there is nothing else', () => {
        expect(withToday([], (date: string) => date, '2026-12-01')).toEqual([
            { kind: 'today', date: '2026-12-01' },
        ]);
    });

    it('should place 今日 between the listed group and the next listing batch', () => {
        const strip = listingStrip(PLAN, CONTEXT, TODAY);
        expect(strip.map((m) => (m.kind === 'today' ? 'today' : m.item.tone))).toEqual([
            'listed',
            'today',
            'b1',
            'b2',
            'b1',
        ]);
        expect(strip[0]).toMatchObject({
            kind: 'item',
            isToday: false,
            item: { span: { first: 1, last: 15 }, date: '2026-11-09' },
        });
    });

    it('should mark the first listing batch when it is today', () => {
        const strip = listingStrip(PLAN, CONTEXT, '2026-12-07');
        expect(strip.filter((m) => m.kind === 'today')).toEqual([]);
        expect(strip[1]).toMatchObject({ kind: 'item', isToday: true, item: { tone: 'b1' } });
    });

    it('should place 今日 on the unlist strip too, and no strip when nothing is unlisted', () => {
        const strip = unlistStrip(PLAN, CONTEXT, TODAY);
        expect(strip[0]).toEqual({ kind: 'today', date: TODAY });
        expect(strip).toHaveLength(6);
        const last = unlistStrip(PLAN, CONTEXT, '2027-01-11').at(-1);
        expect(last).toMatchObject({ kind: 'item', isToday: true, item: { tone: 'off' } });
        const keep = planSchedule(
            { kind: 'dates', batches: [{ from: 1, date: '2026-10-27' }] },
            { firstNo: 1, count: 30 },
        );
        expect(unlistStrip(keep, CONTEXT, TODAY)).toEqual([]);
    });
});

describe('timelineModel — summary while unsaved (用戶 2026-11-12)', () => {
    it('should say 即將排程…（未儲存） for a draft and 已排程 once saved', () => {
        const fresh = { ...CONTEXT, listed: [] };
        expect(progressText(fresh, { draft: true })).toBe('第 1–30 集即將排程上架（未儲存）');
        expect(progressText(fresh, { draft: false })).toBe('第 1–30 集已排程上架');
        expect(progressText(CONTEXT, { plan: PLAN, draft: true })).toBe(
            '第 1–15 集已上架 · 第 16–30 集即將排程上架（未儲存） · 第 1–30 集即將排程下架（未儲存）',
        );
        expect(progressText(CONTEXT, { plan: PLAN })).toBe(
            '第 1–15 集已上架 · 第 16–30 集已排程上架 · 第 1–30 集已排程下架',
        );
    });
});

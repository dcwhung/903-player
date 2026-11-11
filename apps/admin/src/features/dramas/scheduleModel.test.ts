import {
    applyPreset,
    formOf,
    presetOf,
    ruleOf,
    switchUnlist,
    weekdaysOf,
    type ScheduleContext,
    type ScheduleForm,
} from './scheduleModel';

const TODAY = '2026-12-01';

/** 未上架過：30 集 */
const FRESH: ScheduleContext = { firstNo: 1, count: 30, listed: [], unlisted: {}, today: TODAY };

/** mockup ⑧：第 1–15 集已上架（26/10、2/11、9/11 各 5 集） */
const PARTLY: ScheduleContext = {
    ...FRESH,
    listed: [
        { first: 1, last: 5, date: '2026-10-26' },
        { first: 6, last: 10, date: '2026-11-02' },
        { first: 11, last: 15, date: '2026-11-09' },
    ],
};

/** mockup ①：全部 30 集 27/10 已上架 */
const DONE: ScheduleContext = { ...FRESH, listed: [{ first: 1, last: 30, date: '2026-10-27' }] };

const LISTED_STARTS = [
    { from: 1, date: '2026-10-26' },
    { from: 6, date: '2026-11-02' },
    { from: 11, date: '2026-11-09' },
];

describe('scheduleModel — listing presets', () => {
    it('should turn presets into rules for an arc never listed', () => {
        const rule = (key: Parameters<typeof applyPreset>[0]) =>
            ruleOf({ listing: applyPreset(key, TODAY), unlist: { mode: 'none' } }, FRESH);
        expect(rule('all')).toEqual({ kind: 'dates', batches: [{ from: 1, date: TODAY }] });
        expect(rule('daily')).toEqual({
            kind: 'periodic',
            start: TODAY,
            perRelease: 1,
            every: { days: 1 },
        });
        // 2026-12-01 係星期二
        expect(rule('weekly')).toEqual({
            kind: 'periodic',
            start: TODAY,
            perRelease: 1,
            every: { weekdays: [2] },
        });
    });

    it('should spot the preset of a listing form', () => {
        expect(presetOf(applyPreset('daily', TODAY))).toBe('daily');
        expect(
            presetOf({ mode: 'periodic', start: TODAY, every: { weekdays: [1] }, perRelease: 5 }),
        ).toBeUndefined();
    });

    it('should save all seven weekdays as every day', () => {
        const form: ScheduleForm = {
            listing: {
                mode: 'periodic',
                start: TODAY,
                every: { weekdays: [0, 1, 2, 3, 4, 5, 6] },
                perRelease: 2,
            },
            unlist: { mode: 'none' },
        };
        expect(ruleOf(form, FRESH)).toMatchObject({ every: { days: 1 } });
        expect(weekdaysOf(applyPreset('daily', TODAY))).toHaveLength(7);
    });
});

describe('scheduleModel — only the episodes not listed yet', () => {
    it('should keep the listed batches before a periodic rule for the rest', () => {
        const form: ScheduleForm = {
            listing: {
                mode: 'periodic',
                start: '2026-12-07',
                every: { weekdays: [1] },
                perRelease: 5,
            },
            unlist: { mode: 'none' },
        };
        expect(ruleOf(form, PARTLY)).toEqual({
            kind: 'periodic',
            start: '2026-12-07',
            perRelease: 5,
            every: { weekdays: [1] },
            from: 16,
            listed: LISTED_STARTS,
        });
    });

    it('should list the rest at once after the listed batches', () => {
        const form: ScheduleForm = {
            listing: { mode: 'all', start: '2026-12-07' },
            unlist: { mode: 'none' },
        };
        expect(ruleOf(form, PARTLY)).toEqual({
            kind: 'dates',
            batches: [...LISTED_STARTS, { from: 16, date: '2026-12-07' }],
        });
    });

    it('should read a saved periodic rule back from its next batch after today', () => {
        // 由 26/10 起逢一 5 集、今日 10/11：第 1–15 集已上架，第 16 集起嘅下一批 = 16/11
        const saved = {
            kind: 'periodic' as const,
            start: '2026-10-26',
            perRelease: 5,
            every: { weekdays: [1] as 1[] },
        };
        const context = { ...PARTLY, today: '2026-11-10' };
        const form = formOf(saved, context);
        expect(form.listing).toEqual({
            mode: 'periodic',
            start: '2026-11-16',
            every: { weekdays: [1] },
            perRelease: 5,
        });
        expect(ruleOf(form, context)).toMatchObject({ from: 16, start: '2026-11-16' });
    });

    it('should read a single remaining dates batch as 一次性全部 and several as custom', () => {
        const one = {
            kind: 'dates' as const,
            batches: [...LISTED_STARTS, { from: 16, date: '2026-12-07' }],
        };
        expect(formOf(one, PARTLY).listing).toEqual({ mode: 'all', start: '2026-12-07' });
        const two = {
            kind: 'dates' as const,
            batches: [...one.batches, { from: 21, date: '2026-12-14' }],
        };
        const custom = formOf(two, PARTLY);
        expect(custom.listing).toEqual({
            mode: 'custom',
            batches: [
                { from: 16, date: '2026-12-07' },
                { from: 21, date: '2026-12-14' },
            ],
        });
        expect(ruleOf(custom, PARTLY)).toEqual(two);
    });

    it('should start a new listing tomorrow when the last batch went up today', () => {
        const context = { ...PARTLY, today: '2026-11-09' };
        expect(formOf(null, context).listing).toEqual({ mode: 'all', start: '2026-11-10' });
        expect(formOf(null, FRESH).listing).toEqual({ mode: 'all', start: TODAY });
    });
});

describe('scheduleModel — all episodes listed', () => {
    it('should only allow unlisting and keep the listed batches as they are', () => {
        const form = formOf(null, DONE);
        expect(form).toEqual({ listing: { mode: 'done' }, unlist: { mode: 'none' } });
        expect(ruleOf({ ...form, unlist: { mode: 'date', date: '2026-12-31' } }, DONE)).toEqual({
            kind: 'dates',
            batches: [{ from: 1, date: '2026-10-27' }],
            unlist: { kind: 'date', date: '2026-12-31' },
        });
    });
});

describe('scheduleModel — unlisting', () => {
    const listing = { mode: 'all' as const, start: TODAY };

    it.each([
        [
            { mode: 'date', date: '2026-12-31' },
            { kind: 'date', date: '2026-12-31' },
        ],
        [
            { mode: 'afterDays', days: 90 },
            { kind: 'afterDays', days: 90 },
        ],
        [
            { mode: 'periodic', start: '2026-12-14', every: { weekdays: [1] }, perRelease: 6 },
            { kind: 'periodic', start: '2026-12-14', perRelease: 6, every: { weekdays: [1] } },
        ],
    ] as const)('should write %j as unlist and read it back', (unlist, expected) => {
        const rule = ruleOf({ listing, unlist }, FRESH);
        expect(rule.unlist).toEqual(expected);
        expect(formOf(rule, FRESH).unlist).toEqual(unlist);
    });

    it('should read the old removeAfterDays as 上架 N 日後', () => {
        const legacy = {
            kind: 'dates' as const,
            batches: [{ from: 1, date: '2026-12-05' }],
            removeAfterDays: 90,
        };
        expect(formOf(legacy, FRESH).unlist).toEqual({ mode: 'afterDays', days: 90 });
        // 存返就係新格式（unlist），唔再寫 removeAfterDays
        const rule = ruleOf(formOf(legacy, FRESH), FRESH);
        expect(rule).not.toHaveProperty('removeAfterDays');
        expect(rule.unlist).toEqual({ kind: 'afterDays', days: 90 });
    });

    it('should keep removals already past whatever the new unlist is (mockup ⑤)', () => {
        const context = { ...DONE, unlisted: { '1-10': '2026-11-04' } };
        expect(ruleOf({ listing: { mode: 'done' }, unlist: { mode: 'none' } }, context)).toEqual({
            kind: 'dates',
            batches: [{ from: 1, date: '2026-10-27' }],
            unlisted: { '1-10': '2026-11-04' },
        });
    });

    it('should give each unlist mode a default after the last listing', () => {
        const form: ScheduleForm = { listing: { mode: 'done' }, unlist: { mode: 'none' } };
        // 最遲上架 27/10、今日 1/12 → 由今日 + 30 日起
        expect(switchUnlist('date', form, DONE)).toEqual({ mode: 'date', date: '2026-12-31' });
        expect(switchUnlist('afterDays', form, DONE)).toEqual({ mode: 'afterDays', days: 90 });
        expect(switchUnlist('periodic', form, DONE)).toEqual({
            mode: 'periodic',
            start: '2026-12-31',
            every: { weekdays: [4] },
            perRelease: 5,
        });
        expect(switchUnlist('none', form, DONE)).toEqual({ mode: 'none' });
        // 上架排到 7/1 → 由 7/1 + 30 日起
        const later: ScheduleForm = { ...form, listing: { mode: 'all', start: '2027-01-07' } };
        expect(switchUnlist('date', later, FRESH)).toEqual({ mode: 'date', date: '2027-02-06' });
    });
});

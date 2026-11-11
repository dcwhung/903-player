import { applyPreset, describeRule, formOf, presetOf, ruleOf, weekdaysOf } from './scheduleModel';

const TODAY = '2026-11-10';

describe('scheduleModel', () => {
    it('should turn presets into rules', () => {
        expect(ruleOf(applyPreset('all', TODAY), 1)).toEqual({
            kind: 'dates',
            batches: [{ from: 1, date: TODAY }],
        });
        expect(ruleOf(applyPreset('daily', TODAY), 1)).toEqual({
            kind: 'periodic',
            start: TODAY,
            perRelease: 1,
            every: { days: 1 },
        });
        expect(ruleOf(applyPreset('mwf', TODAY), 1)).toEqual({
            kind: 'periodic',
            start: TODAY,
            perRelease: 5,
            every: { weekdays: [1, 3, 5] },
        });
        // 2026-11-10 係星期二
        expect(ruleOf(applyPreset('weekly', TODAY), 1)).toEqual({
            kind: 'periodic',
            start: TODAY,
            perRelease: 1,
            every: { weekdays: [2] },
        });
    });

    it('should round-trip rules through the sentence form and spot presets', () => {
        const rule = {
            kind: 'periodic' as const,
            start: '2026-11-12',
            perRelease: 5,
            every: { weekdays: [3, 5] as (3 | 5)[] },
            removeAfterDays: 30,
        };
        const form = formOf(rule, TODAY);
        expect(ruleOf(form, 1)).toEqual(rule);
        expect(presetOf(form)).toBeUndefined();
        expect(presetOf(applyPreset('mwf', TODAY))).toBe('mwf');
    });

    it('should save all seven weekdays as every day', () => {
        const form = {
            mode: 'periodic' as const,
            start: TODAY,
            every: { weekdays: [0, 1, 2, 3, 4, 5, 6] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[] },
            perRelease: 2,
            removeAfterDays: null,
        };
        expect(ruleOf(form, 1)).toMatchObject({ every: { days: 1 } });
        expect(weekdaysOf(applyPreset('daily', TODAY))).toHaveLength(7);
    });

    it('should keep multi-batch date rules as custom', () => {
        const rule = {
            kind: 'dates' as const,
            batches: [
                { from: 1, date: TODAY },
                { from: 6, date: '2026-11-20' },
            ],
        };
        expect(formOf(rule, TODAY)).toEqual({ mode: 'custom', rule });
        expect(formOf(null, TODAY)).toEqual({ mode: 'all', start: TODAY, removeAfterDays: null });
    });

    it('should describe the release pattern', () => {
        expect(
            describeRule({
                kind: 'periodic',
                start: TODAY,
                perRelease: 5,
                every: { weekdays: [3, 5] },
            }),
        ).toBe('逢三、五 · 每次 5 集');
        expect(
            describeRule({ kind: 'periodic', start: TODAY, perRelease: 1, every: { days: 2 } }),
        ).toBe('每 2 日 · 每次 1 集');
    });
});

import type { ScheduleRule } from '@903-player/catalog';
import { validationMessage } from '../editor/validationMessage';
import type { ScheduleContext } from './scheduleModel';
import { saveProblemOf } from './useScheduleForm';

/** review W-715 重現：第 1–10 集 1/6 上架，今日 12/11，「上架 N 日後」預設 90 日 → 30/8 已過 */
const CTX: ScheduleContext = {
    firstNo: 1,
    count: 10,
    today: '2026-11-12',
    listed: [{ first: 1, last: 10, date: '2026-06-01' }],
    unlisted: {},
};

const afterDays = (days: number): ScheduleRule => ({
    kind: 'dates',
    batches: [{ from: 1, date: '2026-06-01' }],
    unlist: { kind: 'afterDays', days },
});

describe('saveProblemOf — unlist date before today (W-715)', () => {
    it('should refuse an unlist date already past, naming the first episode', () => {
        const problem = saveProblemOf(afterDays(90), CTX);
        expect(problem).toBe('episode 1 unlist date 2026-08-30 is before today 2026-11-12');
        expect(validationMessage(problem ?? '')).toBe(
            '第 1 集的下架日期（30/8 日）早於今日，請修改下架設定。',
        );
    });

    it('should accept an unlist date of today or later', () => {
        // 1/6 + 164 日 = 12/11（今日）
        expect(saveProblemOf(afterDays(164), CTX)).toBeUndefined();
        expect(saveProblemOf(afterDays(200), CTX)).toBeUndefined();
    });

    it('should not count episodes already unlisted (kept past removals)', () => {
        const kept: ScheduleRule = {
            kind: 'dates',
            batches: [{ from: 1, date: '2026-06-01' }],
            unlisted: { '1-5': '2026-08-01' },
            unlist: { kind: 'date', date: '2026-12-31' },
        };
        expect(saveProblemOf(kept, { ...CTX, unlisted: { '1-5': '2026-08-01' } })).toBeUndefined();
    });

    it('should report the first episode in order when only later ones are past', () => {
        const ctx = {
            ...CTX,
            listed: [
                { first: 1, last: 5, date: '2026-10-01' },
                { first: 6, last: 10, date: '2026-06-01' },
            ],
        };
        const rule: ScheduleRule = {
            kind: 'dates',
            batches: [
                { from: 1, date: '2026-06-01' },
                { from: 6, date: '2026-07-01' },
            ],
            unlist: { kind: 'afterDays', days: 120 },
        };
        // 第 1 集 1/6 + 120 = 29/9（過咗）
        expect(saveProblemOf(rule, ctx)).toMatch(/^episode 1 unlist date 2026-09-29 /);
    });
});

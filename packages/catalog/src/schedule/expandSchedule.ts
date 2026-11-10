/*
 * 排程規則 → 短篇嘅 addedAt / episodeDates / episodeRemovedAt（只適用於 series 短篇；daily 本身逐日列出）。
 * 全部係香港日曆日（YYYY-MM-DD 字串運算），冇時區偏移；結果一定過 drama.json 同一套上架 / 下架 validator
 */
import { SchemaError } from '../core/reader';
import { addDays, isCalendarDate, weekdayOf } from '../date';
import { readEpisodeDates, readEpisodeRemovals } from '../dramas/availabilitySchema';
import { ScheduleError, type DatesRule, type PeriodicRule, type ScheduleRule } from './rule';

export { parseScheduleRule, ScheduleError, type ScheduleRule } from './rule';

export interface ExpandedSchedule {
    /** 第一批上架日（短篇 addedAt） */
    addedAt: string;
    /** 第二批起：集數 → 「呢集起」上架日 */
    episodeDates: Record<string, string>;
    /** 每批下架日：「a-b」（單集「a」）→ 日子 */
    episodeRemovedAt: Record<string, string>;
}

export interface ScheduleArc {
    firstNo: number;
    /** 集數；未知（未上架短篇冇寫 episodes）就唔可以排 */
    count: number | undefined;
}

interface Batch {
    first: number;
    last: number;
    date: string;
}

const LAST_WEEKDAY = 6;
/** 防呆：一個短篇最多排幾多集（現有最長 50 幾集） */
const MAX_EPISODES = 1000;
/** 每 N 日 / N 日後下架嘅上限（約 10 年）：再大 addDays 會出界（RangeError → 500，W-704） */
const MAX_SCHEDULE_DAYS = 3660;

const fail = (message: string): never => {
    throw new ScheduleError(message);
};

const checkPositiveInteger = (value: number, path: string): void => {
    if (!Number.isInteger(value) || value < 1) fail(`${path} must be a positive integer`);
};

const checkDays = (value: number, path: string): void => {
    checkPositiveInteger(value, path);
    if (value > MAX_SCHEDULE_DAYS) fail(`${path} must be at most ${MAX_SCHEDULE_DAYS}`);
};

const checkDate = (value: string, path: string): void => {
    if (!isCalendarDate(value)) fail(`${path} must be a YYYY-MM-DD date`);
};

/** 每批嘅開始集數 → 連埋結束集數 */
const toBatches = (starts: readonly { from: number; date: string }[], last: number): Batch[] =>
    starts.map((start, i) => ({
        first: start.from,
        last: (starts[i + 1]?.from ?? last + 1) - 1,
        date: start.date,
    }));

const datesBatches = (rule: DatesRule, firstNo: number, last: number): Batch[] => {
    const { batches } = rule;
    if (batches[0]?.from !== firstNo) fail(`batches[0].from must be the first episode ${firstNo}`);
    batches.forEach(({ from, date }, i) => {
        checkDate(date, `batches[${i}].date`);
        const previous = batches[i - 1];
        if (previous && (from <= previous.from || date <= previous.date))
            fail(`batches[${i}] must come after batches[${i - 1}] (episode and date)`);
        if (!Number.isInteger(from) || from > last)
            fail(`batches[${i}].from must be an episode number up to ${last}`);
    });
    return toBatches(batches, last);
};

/** 由 start 起（包括 start）逐日數，揀星期幾合規嘅頭 n 日 */
const weekdayDates = (start: string, weekdays: readonly number[], n: number): string[] => {
    const days = new Set(weekdays);
    if (days.size === 0) fail('every.weekdays must not be empty');
    weekdays.forEach((d) => {
        if (!Number.isInteger(d) || d < 0 || d > LAST_WEEKDAY) fail('every.weekdays must be 0–6');
    });
    const dates: string[] = [];
    for (let date = start; dates.length < n; date = addDays(date, 1))
        if (days.has(weekdayOf(date))) dates.push(date);
    return dates;
};

const releaseDates = (rule: PeriodicRule, n: number): string[] => {
    if ('weekdays' in rule.every) return weekdayDates(rule.start, rule.every.weekdays, n);
    const { days } = rule.every;
    checkDays(days, 'every.days');
    return Array.from({ length: n }, (_, i) => addDays(rule.start, i * days));
};

const periodicBatches = (rule: PeriodicRule, firstNo: number, count: number): Batch[] => {
    checkDate(rule.start, 'start');
    checkPositiveInteger(rule.perRelease, 'perRelease');
    const dates = releaseDates(rule, Math.ceil(count / rule.perRelease));
    const starts = dates.map((date, i) => ({ from: firstNo + i * rule.perRelease, date }));
    return toBatches(starts, firstNo + count - 1);
};

const rangeKey = ({ first, last }: Batch): string =>
    first === last ? String(first) : `${first}-${last}`;

const removals = (batches: readonly Batch[], days: number | undefined): Record<string, string> => {
    if (days === undefined) return {};
    checkDays(days, 'removeAfterDays');
    return Object.fromEntries(batches.map((b) => [rangeKey(b), addDays(b.date, days)]));
};

const VALIDATION_CONTEXT = { id: 'schedule', source: 'schedule', files: new Set<string>() };

/** 最後防線：同 drama.json 一樣嘅上架 / 下架規則 */
const validate = (expanded: ExpandedSchedule, firstNo: number, last: number): void => {
    const arc = { path: 'schedule', range: { first: firstNo, last }, addedAt: expanded.addedAt };
    const raw = { ...expanded };
    try {
        const episodeDates = readEpisodeDates(VALIDATION_CONTEXT, raw, arc);
        const context = { ...arc, episodeDates, removedAt: undefined };
        readEpisodeRemovals(VALIDATION_CONTEXT, raw, context);
    } catch (error) {
        if (error instanceof SchemaError) fail(error.message);
        throw error;
    }
};

const batchesOf = (rule: ScheduleRule, firstNo: number, count: number): Batch[] =>
    rule.kind === 'dates'
        ? datesBatches(rule, firstNo, firstNo + count - 1)
        : periodicBatches(rule, firstNo, count);

/** 排程規則 → 短篇上架 / 下架欄位；規則唔啱 / 集數未知 → ScheduleError */
export const expandSchedule = (
    rule: ScheduleRule,
    { firstNo, count }: ScheduleArc,
): ExpandedSchedule => {
    if (count === undefined) return fail('the arc episode count is not known yet');
    if (!Number.isInteger(count) || count < 1 || count > MAX_EPISODES)
        fail(`episode count must be 1–${MAX_EPISODES}`);
    const batches = batchesOf(rule, firstNo, count);
    const [first, ...rest] = batches;
    if (!first) return fail('rule has no batches');
    const expanded = {
        addedAt: first.date,
        episodeDates: Object.fromEntries(rest.map((b) => [String(b.first), b.date])),
        episodeRemovedAt: removals(batches, rule.removeAfterDays),
    };
    validate(expanded, firstNo, firstNo + count - 1);
    return expanded;
};

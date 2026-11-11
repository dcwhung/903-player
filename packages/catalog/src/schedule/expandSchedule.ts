/*
 * 排程規則 → 短篇嘅 addedAt / episodeDates / episodeRemovedAt（只適用於 series 短篇；daily 本身逐日列出）。
 * 全部係香港日曆日（YYYY-MM-DD 字串運算），冇時區偏移；結果一定過 drama.json 同一套上架 / 下架 validator。
 * planSchedule = 逐集上架 / 下架日（admin 時間軸用，有衝突照出）；expandSchedule = plan + 驗證 → arc 欄位
 */
import { SchemaError } from '../core/reader';
import { addDays, isCalendarDate, weekdayOf } from '../date';
import { readEpisodeDates, readEpisodeRemovals } from '../dramas/availabilitySchema';
import type { EpisodeRange } from '../types/drama';
import {
    ScheduleError,
    unlistOf,
    type Cadence,
    type DatesRule,
    type PeriodicRule,
    type ScheduleBatch,
    type ScheduleRule,
    type UnlistRule,
} from './rule';

export {
    parseScheduleRule,
    ScheduleError,
    unlistOf,
    type Cadence,
    type ScheduleBatch,
    type ScheduleRule,
    type UnlistRule,
} from './rule';

export interface ExpandedSchedule {
    /** 第一批上架日（短篇 addedAt） */
    addedAt: string;
    /** 第二批起：集數 → 「呢集起」上架日 */
    episodeDates: Record<string, string>;
    /** 下架日：「a-b」（單集「a」）→ 日子；連續集數同一日就併做一段 */
    episodeRemovedAt: Record<string, string>;
}

export interface ScheduleArc {
    firstNo: number;
    /** 集數；未知（未上架短篇冇寫 episodes）就唔可以排 */
    count: number | undefined;
}

/** 一集嘅上架 / 下架日（冇下架 = 唔出 removedAt） */
export interface EpisodeSchedule {
    no: number;
    listedAt: string;
    removedAt?: string;
}

export interface SchedulePlan {
    /** 上架批次（同 batchesOf 一樣形狀） */
    batches: EpisodeRange[];
    /** 逐集，由第一集起 */
    episodes: EpisodeSchedule[];
    /** 下架日早過或者等於上架日嘅集數（expandSchedule 會拒絕；admin 儲存時先彈錯誤） */
    conflicts: EpisodeSchedule[];
}

const LAST_WEEKDAY = 6;
/** 防呆：一個短篇最多排幾多集（現有最長 50 幾集） */
const MAX_EPISODES = 1000;
/** 每 N 日 / N 日後下架嘅上限（約 10 年）：再大 addDays 會出界（RangeError → 500，W-704） */
const MAX_SCHEDULE_DAYS = 3660;
const RANGE_KEY = /^(\d+)(?:-(\d+))?$/;

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
const toBatches = (starts: readonly ScheduleBatch[], last: number): EpisodeRange[] =>
    starts.map((start, i) => ({
        first: start.from,
        last: (starts[i + 1]?.from ?? last + 1) - 1,
        date: start.date,
    }));

/** 明寫嘅批次（dates 規則 / periodic 嘅 listed）：由 firstNo 起、集數同日子遞增、唔超過 last */
const checkStarts = (
    batches: readonly ScheduleBatch[],
    path: string,
    firstNo: number,
    last: number,
): void => {
    if (batches[0]?.from !== firstNo) fail(`${path}[0].from must be the first episode ${firstNo}`);
    batches.forEach(({ from, date }, i) => {
        checkDate(date, `${path}[${i}].date`);
        const previous = batches[i - 1];
        if (previous && (from <= previous.from || date <= previous.date))
            fail(`${path}[${i}] must come after ${path}[${i - 1}] (episode and date)`);
        if (!Number.isInteger(from) || from > last)
            fail(`${path}[${i}].from must be an episode number up to ${last}`);
    });
};

const datesStarts = (rule: DatesRule, firstNo: number, last: number): ScheduleBatch[] => {
    checkStarts(rule.batches, 'batches', firstNo, last);
    return rule.batches;
};

/** 由 start 起（包括 start）逐日數，揀星期幾合規嘅頭 n 日 */
const weekdayDates = (
    start: string,
    weekdays: readonly number[],
    n: number,
    path: string,
): string[] => {
    const days = new Set(weekdays);
    if (days.size === 0) fail(`${path}.weekdays must not be empty`);
    weekdays.forEach((d) => {
        if (!Number.isInteger(d) || d < 0 || d > LAST_WEEKDAY) fail(`${path}.weekdays must be 0–6`);
    });
    const dates: string[] = [];
    for (let date = start; dates.length < n; date = addDays(date, 1))
        if (days.has(weekdayOf(date))) dates.push(date);
    return dates;
};

/** 上架 / 下架共用：由 start 起每 N 日或者逢星期幾，頭 n 個日子 */
const cadenceDates = (start: string, every: Cadence, n: number, path: string): string[] => {
    if ('weekdays' in every) return weekdayDates(start, every.weekdays, n, path);
    checkDays(every.days, `${path}.days`);
    return Array.from({ length: n }, (_, i) => addDays(start, i * every.days));
};

/** periodic 嘅 from / listed：已上架批次照留，規則由 from 起（冇就由第一集起） */
const listedPart = (rule: PeriodicRule, firstNo: number, last: number) => {
    if (rule.from === undefined || rule.listed === undefined) {
        if (rule.from !== undefined || rule.listed !== undefined)
            fail('from and listed must be given together');
        return { from: firstNo, listed: [] };
    }
    const { from, listed } = rule;
    if (!Number.isInteger(from) || from <= firstNo || from > last)
        fail(`from must be an episode number from ${firstNo + 1} to ${last}`);
    checkStarts(listed, 'listed', firstNo, from - 1);
    return { from, listed };
};

const periodicStarts = (rule: PeriodicRule, firstNo: number, last: number): ScheduleBatch[] => {
    const { from, listed } = listedPart(rule, firstNo, last);
    checkDate(rule.start, 'start');
    checkPositiveInteger(rule.perRelease, 'perRelease');
    const count = last - from + 1;
    const dates = cadenceDates(rule.start, rule.every, Math.ceil(count / rule.perRelease), 'every');
    const lastListed = listed.at(-1)?.date;
    if (lastListed && (dates[0] ?? '') <= lastListed)
        fail(`start must be later than the listed batches (${lastListed})`);
    return [...listed, ...dates.map((date, i) => ({ from: from + i * rule.perRelease, date }))];
};

const batchesFor = (rule: ScheduleRule, firstNo: number, last: number): EpisodeRange[] =>
    toBatches(
        rule.kind === 'dates'
            ? datesStarts(rule, firstNo, last)
            : periodicStarts(rule, firstNo, last),
        last,
    );

/** unlisted（已經落咗架）：「a-b」→ 每集日子；範圍要喺短篇入面、唔可以重疊 */
const keptRemovals = (
    unlisted: Readonly<Record<string, string>>,
    firstNo: number,
    last: number,
): Map<number, string> => {
    const kept = new Map<number, string>();
    Object.entries(unlisted).forEach(([key, date]) => {
        const path = `unlisted["${key}"]`;
        const match = RANGE_KEY.exec(key);
        const first = Number(match?.[1]);
        const end = match?.[2] === undefined ? first : Number(match[2]);
        if (!match || end < first) fail(`${path} must be an episode number or a range like "1-5"`);
        if (first < firstNo || end > last) fail(`${path} is outside ${firstNo}–${last}`);
        checkDate(date, path);
        for (let no = first; no <= end; no += 1) {
            if (kept.has(no)) fail(`${path} overlaps another range`);
            kept.set(no, date);
        }
    });
    return kept;
};

/** 新下架規則：未落架嘅集數（由細到大）→ 下架日 */
const unlistDates = (unlist: UnlistRule, rest: readonly EpisodeSchedule[]): string[] => {
    if (unlist.kind === 'date') {
        checkDate(unlist.date, 'unlist.date');
        return rest.map(() => unlist.date);
    }
    if (unlist.kind === 'afterDays') {
        checkDays(unlist.days, 'unlist.days');
        return rest.map((episode) => addDays(episode.listedAt, unlist.days));
    }
    checkDate(unlist.start, 'unlist.start');
    checkPositiveInteger(unlist.perRelease, 'unlist.perRelease');
    const n = Math.ceil(rest.length / unlist.perRelease);
    const dates = cadenceDates(unlist.start, unlist.every, n, 'unlist.every');
    return rest.map((_, i) => dates[Math.floor(i / unlist.perRelease)] ?? '');
};

const withRemovals = (
    rule: ScheduleRule,
    listed: readonly EpisodeSchedule[],
    firstNo: number,
    last: number,
): EpisodeSchedule[] => {
    const kept = keptRemovals(rule.unlisted ?? {}, firstNo, last);
    const unlist = unlistOf(rule);
    const rest = listed.filter((episode) => !kept.has(episode.no));
    const dates = unlist ? unlistDates(unlist, rest) : [];
    const planned = new Map(rest.map((episode, i) => [episode.no, dates[i]]));
    return listed.map((episode) => {
        const removedAt = kept.get(episode.no) ?? planned.get(episode.no);
        return removedAt === undefined ? episode : { ...episode, removedAt };
    });
};

const checkCount = (count: number | undefined): number => {
    if (count === undefined) return fail('the arc episode count is not known yet');
    if (!Number.isInteger(count) || count < 1 || count > MAX_EPISODES)
        fail(`episode count must be 1–${MAX_EPISODES}`);
    return count;
};

/** 排程規則 → 逐集上架 / 下架日（下架日衝突照出，見 conflicts）；規則唔啱 / 集數未知 → ScheduleError */
export const planSchedule = (rule: ScheduleRule, { firstNo, count }: ScheduleArc): SchedulePlan => {
    const last = firstNo + checkCount(count) - 1;
    const batches = batchesFor(rule, firstNo, last);
    const listed = batches.flatMap((batch) =>
        Array.from({ length: batch.last - batch.first + 1 }, (_, i) => ({
            no: batch.first + i,
            listedAt: batch.date,
        })),
    );
    const episodes = withRemovals(rule, listed, firstNo, last);
    const conflicts = episodes.filter(
        (e) => e.removedAt !== undefined && e.removedAt <= e.listedAt,
    );
    return { batches, episodes, conflicts };
};

const rangeKey = (first: number, last: number): string =>
    first === last ? String(first) : `${first}-${last}`;

/** 連續集數同一個下架日 → 一段 */
const removalRanges = (episodes: readonly EpisodeSchedule[]): Record<string, string> => {
    const ranges: EpisodeRange[] = [];
    episodes.forEach(({ no, removedAt }) => {
        if (removedAt === undefined) return;
        const previous = ranges.at(-1);
        if (previous && previous.last === no - 1 && previous.date === removedAt) previous.last = no;
        else ranges.push({ first: no, last: no, date: removedAt });
    });
    return Object.fromEntries(ranges.map((r) => [rangeKey(r.first, r.last), r.date]));
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

/** 排程規則 → 短篇上架 / 下架欄位；規則唔啱 / 集數未知 / 下架日唔遲過上架日 → ScheduleError */
export const expandSchedule = (rule: ScheduleRule, arc: ScheduleArc): ExpandedSchedule => {
    const { batches, episodes, conflicts } = planSchedule(rule, arc);
    const [conflict] = conflicts;
    // admin（validationMessage）靠呢句原文 map 中文，改字要一齊改
    if (conflict)
        fail(
            `episode ${conflict.no} unlist date ${conflict.removedAt} must be later than its listing date ${conflict.listedAt}`,
        );
    const [first, ...rest] = batches;
    if (!first) return fail('rule has no batches');
    const expanded = {
        addedAt: first.date,
        episodeDates: Object.fromEntries(rest.map((b) => [String(b.first), b.date])),
        episodeRemovedAt: removalRanges(episodes),
    };
    validate(expanded, arc.firstNo, arc.firstNo + episodes.length - 1);
    return expanded;
};

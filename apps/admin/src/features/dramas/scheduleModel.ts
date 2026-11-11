/*
 * 排程（_mockups_/admin-schedule-unlist ⑧）：左「上架」句子（只排未上架嘅集數）+ 右「下架」句子 ↔ ScheduleRule。
 * 已上架批次（ScheduleContext.listed）原封不動寫入 rule（dates 批次 / periodic 嘅 from + listed）；
 * 已經過咗下架日嘅下架（unlisted）照留；舊 removeAfterDays 讀做「上架 N 日後」，存返用 unlist
 */
import {
    addDays,
    planSchedule,
    unlistOf,
    type Cadence,
    type EpisodeRange,
    type ScheduleBatch,
    type ScheduleRule,
    type UnlistRule,
    type Weekday,
    weekdayOf,
} from '@903-player/catalog';

const DAYS_PER_WEEK = 7;
const ALL_WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
/** 揀下架方式時嘅預設：最遲上架日（或者今日）之後 30 日；上架 90 日後；每次 5 集 */
const DEFAULT_UNLIST_GAP_DAYS = 30;
const DEFAULT_AFTER_DAYS = 90;
const DEFAULT_PER_UNLIST = 5;

export type Every = Cadence;

/** 排程 tab 嘅固定部分（由 definition 讀，見 stripModel.scheduleContextOf） */
export interface ScheduleContext {
    firstNo: number;
    count: number;
    /** 已上架批次（日子 ≤ 今日）：唔改得 */
    listed: EpisodeRange[];
    /** 已經過咗下架日嘅下架（「a-b」→ 日子）：唔受新規則影響 */
    unlisted: Record<string, string>;
    today: string;
}

interface Periodic {
    start: string;
    every: Every;
    perRelease: number;
}

export type ListingForm =
    /** 全部已上架：只可以設下架 */
    | { mode: 'done' }
    | { mode: 'all'; start: string }
    | ({ mode: 'periodic' } & Periodic)
    /** 自訂多批（API 直接寫嘅 dates 規則）：句子唔改得，揀快速套用就換走 */
    | { mode: 'custom'; batches: ScheduleBatch[] };

export type UnlistMode = 'none' | 'date' | 'afterDays' | 'periodic';
export const UNLIST_MODES: readonly UnlistMode[] = ['none', 'date', 'afterDays', 'periodic'];

export type UnlistForm =
    | { mode: 'none' }
    | { mode: 'date'; date: string }
    | { mode: 'afterDays'; days: number }
    | ({ mode: 'periodic' } & Periodic);

export interface ScheduleForm {
    listing: ListingForm;
    unlist: UnlistForm;
}

const lastNoOf = (ctx: ScheduleContext) => ctx.firstNo + ctx.count - 1;

/** 第一集未上架嘅集數（全部已上架 = lastNo + 1） */
export const nextNoOf = (ctx: ScheduleContext): number =>
    (ctx.listed.at(-1)?.last ?? ctx.firstNo - 1) + 1;

export const isAllListed = (ctx: ScheduleContext) => nextNoOf(ctx) > lastNoOf(ctx);

/** 新上架嘅開始日：今日；如果今日已經上咗一批，就由聽日起（批次日子要遞增） */
const defaultStart = (ctx: ScheduleContext): string =>
    (ctx.listed.at(-1)?.date ?? '') >= ctx.today ? addDays(ctx.today, 1) : ctx.today;

const listedStarts = (ctx: ScheduleContext): ScheduleBatch[] =>
    ctx.listed.map((b) => ({ from: b.first, date: b.date }));

/** 七日全揀 = 每日 */
const normalEvery = (every: Every): Every =>
    'weekdays' in every && every.weekdays.length === DAYS_PER_WEEK ? { days: 1 } : every;

const periodicOf = ({ start, every, perRelease }: Periodic): Periodic => ({
    start,
    every,
    perRelease,
});

const unlistFormOf = (unlist: UnlistRule | undefined): UnlistForm => {
    if (!unlist) return { mode: 'none' };
    if (unlist.kind === 'date') return { mode: 'date', date: unlist.date };
    if (unlist.kind === 'afterDays') return { mode: 'afterDays', days: unlist.days };
    return { mode: 'periodic', ...periodicOf(unlist) };
};

const futureStarts = (rule: ScheduleRule, ctx: ScheduleContext): ScheduleBatch[] => {
    try {
        return planSchedule(rule, ctx)
            .batches.filter((b) => b.first >= nextNoOf(ctx))
            .map((b) => ({ from: b.first, date: b.date }));
    } catch {
        // 舊規則同短篇對唔上（例如集數改咗）：當未排，用預設
        return [];
    }
};

const listingFormOf = (rule: ScheduleRule | null, ctx: ScheduleContext): ListingForm => {
    if (isAllListed(ctx)) return { mode: 'done' };
    const fallback: ListingForm = { mode: 'all', start: defaultStart(ctx) };
    if (!rule) return fallback;
    const future = futureStarts(rule, ctx);
    const [first] = future;
    if (!first || first.from !== nextNoOf(ctx)) return fallback;
    // periodic：句子由下一批（今日之後）起計，已上架嗰段變 listed
    if (rule.kind === 'periodic')
        return { mode: 'periodic', ...periodicOf({ ...rule, start: first.date }) };
    return future.length === 1
        ? { mode: 'all', start: first.date }
        : { mode: 'custom', batches: future };
};

export const formOf = (rule: ScheduleRule | null, ctx: ScheduleContext): ScheduleForm => ({
    listing: listingFormOf(rule, ctx),
    unlist: unlistFormOf(rule ? unlistOf(rule) : undefined),
});

const listingRule = (listing: ListingForm, ctx: ScheduleContext): ScheduleRule => {
    const listed = listedStarts(ctx);
    const next = nextNoOf(ctx);
    if (listing.mode === 'done') return { kind: 'dates', batches: listed };
    if (listing.mode === 'all')
        return { kind: 'dates', batches: [...listed, { from: next, date: listing.start }] };
    if (listing.mode === 'custom')
        return { kind: 'dates', batches: [...listed, ...listing.batches] };
    const rule: ScheduleRule = {
        kind: 'periodic',
        start: listing.start,
        perRelease: listing.perRelease,
        every: normalEvery(listing.every),
    };
    return listed.length > 0 ? { ...rule, from: next, listed } : rule;
};

const unlistRule = (unlist: UnlistForm): UnlistRule | undefined => {
    if (unlist.mode === 'none') return undefined;
    if (unlist.mode === 'date') return { kind: 'date', date: unlist.date };
    if (unlist.mode === 'afterDays') return { kind: 'afterDays', days: unlist.days };
    return {
        kind: 'periodic',
        start: unlist.start,
        perRelease: unlist.perRelease,
        every: normalEvery(unlist.every),
    };
};

export const ruleOf = (form: ScheduleForm, ctx: ScheduleContext): ScheduleRule => {
    const rule = listingRule(form.listing, ctx);
    const unlist = unlistRule(form.unlist);
    const kept = Object.keys(ctx.unlisted).length > 0 ? { unlisted: ctx.unlisted } : {};
    return { ...rule, ...(unlist ? { unlist } : {}), ...kept };
};

/** 句子入面揀咗嘅星期（每日 = 全部；每 7 日 = 開始嗰日；其他每 N 日 = null，照寫「每 N 日」） */
export const weekdaysOf = ({ start, every }: { start: string; every: Every }): Weekday[] | null => {
    if ('weekdays' in every) return every.weekdays;
    if (every.days === 1) return ALL_WEEKDAYS;
    return every.days === DAYS_PER_WEEK ? [weekdayOf(start)] : null;
};

export type PresetKey = 'all' | 'daily' | 'weekly';
export const PRESET_KEYS: readonly PresetKey[] = ['all', 'daily', 'weekly'];

export const applyPreset = (key: PresetKey, start: string): ListingForm => {
    if (key === 'all') return { mode: 'all', start };
    if (key === 'daily') return { mode: 'periodic', start, every: { days: 1 }, perRelease: 1 };
    return { mode: 'periodic', start, every: { weekdays: [weekdayOf(start)] }, perRelease: 1 };
};

export const presetOf = (listing: ListingForm): PresetKey | undefined =>
    listing.mode === 'all' || listing.mode === 'periodic'
        ? PRESET_KEYS.find(
              (key) => JSON.stringify(applyPreset(key, listing.start)) === JSON.stringify(listing),
          )
        : undefined;

/** 最遲上架日（排程後），排唔到就今日 */
const lastListingOf = (form: ScheduleForm, ctx: ScheduleContext): string => {
    try {
        const last = planSchedule(ruleOf(form, ctx), ctx).batches.at(-1)?.date ?? ctx.today;
        return last > ctx.today ? last : ctx.today;
    } catch {
        return ctx.today;
    }
};

/** 轉下架方式：揀返之前嘅值冇意思，每種用一個合理預設（最遲上架日之後） */
export const switchUnlist = (
    mode: UnlistMode,
    form: ScheduleForm,
    ctx: ScheduleContext,
): UnlistForm => {
    if (mode === 'none') return { mode };
    if (mode === 'afterDays') return { mode, days: DEFAULT_AFTER_DAYS };
    const date = addDays(lastListingOf(form, ctx), DEFAULT_UNLIST_GAP_DAYS);
    if (mode === 'date') return { mode, date };
    return {
        mode,
        start: date,
        every: { weekdays: [weekdayOf(date)] },
        perRelease: DEFAULT_PER_UNLIST,
    };
};

/*
 * 排程時間軸（_mockups_/admin-schedule-unlist ⑧ ⑨）：planSchedule 嘅逐集上架 / 下架日 →
 * 編輯模式兩條時間軸（上架 / 下架）、預覽模式合併時間軸（每日一格）+ 批次表、兩邊頂部可處理嘅集數、tooltip
 */
import {
    daysBetween,
    type EpisodeRange,
    type EpisodeSchedule,
    type SchedulePlan,
} from '@903-player/catalog';
import { t } from '../../i18n/t';
import { dayMonth, shortDate } from '../../model/dates';
import { isAllListed, nextNoOf, type ScheduleContext } from './scheduleModel';

export interface EpisodeSpan {
    first: number;
    last: number;
}

export interface PreviewDay {
    date: string;
    listings: EpisodeRange[];
    removals: EpisodeRange[];
}

/** 一段超過幾多集就縮成「頭 … 尾」 */
const MAX_FULL_CELLS = 3;
const RANGE_KEY = /^(\d+)(?:-(\d+))?$/;

const lastNoOf = (ctx: ScheduleContext) => ctx.firstNo + ctx.count - 1;

/** 時間軸格：短嘅逐集出，長嘅「頭 … 尾」（null = …） */
export const cellsOf = ({ first, last }: EpisodeSpan): (number | null)[] =>
    last - first + 1 <= MAX_FULL_CELLS
        ? Array.from({ length: last - first + 1 }, (_, i) => first + i)
        : [first, null, last];

/** 「第 6 集」/「第 1–5 集」 */
export const rangeText = ({ first, last }: EpisodeSpan): string =>
    first === last
        ? t('schedule.episode', { no: first })
        : t('schedule.episodesRange', { first, last });

/** 遞增集數 → 連續段 */
const spansOf = (nos: readonly number[]): EpisodeSpan[] =>
    nos.reduce<EpisodeSpan[]>((spans, no) => {
        const previous = spans.at(-1);
        if (previous && previous.last === no - 1) previous.last = no;
        else spans.push({ first: no, last: no });
        return spans;
    }, []);

const keptNos = (unlisted: Readonly<Record<string, string>>): Set<number> =>
    new Set(
        Object.keys(unlisted).flatMap((key) => {
            const match = RANGE_KEY.exec(key);
            if (!match) return [];
            const first = Number(match[1]);
            const last = match[2] === undefined ? first : Number(match[2]);
            return Array.from({ length: last - first + 1 }, (_, i) => first + i);
        }),
    );

const listedNos = (ctx: ScheduleContext): number[] =>
    ctx.listed.flatMap((b) => Array.from({ length: b.last - b.first + 1 }, (_, i) => b.first + i));

const spansText = (spans: readonly EpisodeSpan[]) => spans.map(rangeText).join('、');

const plannedSpan = (ctx: ScheduleContext): EpisodeSpan | null =>
    isAllListed(ctx) ? null : { first: nextNoOf(ctx), last: lastNoOf(ctx) };

/** 左 panel 頂：「可上架：第 16–30 集（共 15 集）」 */
export const listingScopeText = (ctx: ScheduleContext): string => {
    const span = plannedSpan(ctx) ?? { first: nextNoOf(ctx), last: lastNoOf(ctx) };
    return t('schedule.listScope', {
        range: rangeText(span),
        count: span.last - span.first + 1,
    });
};

/** 右 panel 頂：「可下架：第 1–15 集（已上架）· 第 16–30 集（已排程上架）」（已下架嘅唔計） */
export const unlistScopeText = (ctx: ScheduleContext): string => {
    const kept = keptNos(ctx.unlisted);
    const listed = spansOf(listedNos(ctx).filter((no) => !kept.has(no)));
    const planned = plannedSpan(ctx);
    const parts = [
        ...(listed.length > 0 ? [t('schedule.scopeListed', { range: spansText(listed) })] : []),
        ...(planned ? [t('schedule.scopePlanned', { range: rangeText(planned) })] : []),
    ];
    return parts.length > 0
        ? t('schedule.unlistScope', { parts: parts.join('· ') })
        : t('schedule.unlistScopeNone');
};

/** 下架時間軸入面新規則排嘅下架（已下架嘅唔計）：集數連續段 */
const unlistSpansOf = (plan: SchedulePlan, ctx: ScheduleContext): EpisodeSpan[] =>
    spansOf(
        unlistTimeline(plan, ctx)
            .planned.flatMap((r) =>
                Array.from({ length: r.last - r.first + 1 }, (_, i) => r.first + i),
            )
            .sort((a, b) => a - b),
    );

/**
 * 檢視列細字：「第 1–15 集已上架 · 第 16–30 集已排程上架 · 第 1–30 集已排程下架」；
 * 未儲存（draft）就寫「即將排程上架（未儲存）」/「即將排程下架（未儲存）」（用戶 2026-11-12）
 */
export const progressText = (
    ctx: ScheduleContext,
    { plan = null, draft = false }: { plan?: SchedulePlan | null; draft?: boolean } = {},
): string => {
    const listed = spansOf(listedNos(ctx));
    const planned = plannedSpan(ctx);
    const unlist = plan ? unlistSpansOf(plan, ctx) : [];
    return [
        ...(listed.length > 0 ? [t('schedule.progressListed', { range: spansText(listed) })] : []),
        ...(planned
            ? [
                  t(draft ? 'schedule.progressPlannedDraft' : 'schedule.progressPlanned', {
                      range: rangeText(planned),
                  }),
              ]
            : []),
        ...(unlist.length > 0
            ? [
                  t(draft ? 'schedule.progressUnlistDraft' : 'schedule.progressUnlist', {
                      range: spansText(unlist),
                  }),
              ]
            : []),
    ].join(' · ');
};

/** 全部已上架：「✓ 已全部上架（27/10 二 · 第 1–30 集）」（日子 = 最後一批） */
export const doneText = (ctx: ScheduleContext): string =>
    t('schedule.allListed', {
        date: shortDate(ctx.listed.at(-1)?.date ?? ctx.today),
        range: rangeText({ first: ctx.firstNo, last: lastNoOf(ctx) }),
    });

/** 上架時間軸：已上架 = 一段灰格 ✓；之後每批 */
export const listingTimeline = (plan: SchedulePlan, ctx: ScheduleContext) => {
    const next = nextNoOf(ctx);
    return {
        listed: ctx.listed.length > 0 ? { first: ctx.firstNo, last: next - 1 } : null,
        planned: plan.batches.filter((b) => b.first >= next),
    };
};

/** 連續集數同一個下架日 → 一段（kept 分開，唔同已排嘅併埋） */
const removalRanges = (
    episodes: readonly EpisodeSchedule[],
    kept: ReadonlySet<number>,
): (EpisodeRange & { kept: boolean })[] =>
    episodes.reduce<(EpisodeRange & { kept: boolean })[]>((ranges, { no, removedAt }) => {
        if (removedAt === undefined) return ranges;
        const isKept = kept.has(no);
        const previous = ranges.at(-1);
        if (
            previous &&
            previous.last === no - 1 &&
            previous.date === removedAt &&
            previous.kept === isKept
        )
            previous.last = no;
        else ranges.push({ first: no, last: no, date: removedAt, kept: isKept });
        return ranges;
    }, []);

const plain = ({ first, last, date }: EpisodeRange): EpisodeRange => ({ first, last, date });

/** 下架時間軸：已下架（唔受新規則影響，mockup ⑤）同排程下架分開 */
export const unlistTimeline = (plan: SchedulePlan, ctx: ScheduleContext) => {
    const ranges = removalRanges(plan.episodes, keptNos(ctx.unlisted));
    return {
        removed: ranges.filter((r) => r.kept).map(plain),
        planned: ranges.filter((r) => !r.kept).map(plain),
    };
};

/** 預覽：今日起每個有上架 / 下架嘅日子一格（mockup ⑨） */
export const previewDays = (plan: SchedulePlan, today: string): PreviewDay[] => {
    const days = new Map<string, PreviewDay>();
    const dayOf = (date: string) => {
        const day = days.get(date) ?? { date, listings: [], removals: [] };
        days.set(date, day);
        return day;
    };
    plan.batches.filter((b) => b.date >= today).forEach((b) => dayOf(b.date).listings.push(b));
    removalRanges(plan.episodes, new Set())
        .filter((r) => r.date >= today)
        .forEach((r) => dayOf(r.date).removals.push(plain(r)));
    return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
};

/** 「第 6 集：23/11 上架，14/12 下架，共 21 日」 */
export const episodeTip = ({ no, listedAt, removedAt }: EpisodeSchedule): string =>
    removedAt === undefined
        ? t('schedule.tipKeep', { no, listed: dayMonth(listedAt) })
        : t('schedule.tipBoth', {
              no,
              listed: dayMonth(listedAt),
              removed: dayMonth(removedAt),
              days: daysBetween(listedAt, removedAt),
          });

/** 時間軸 / 批次表加「今日」（用戶 2026-11-12）：撞正某格 = 嗰格 isToday；唔撞 = 按日子次序插一格 today */
export type TodayMarked<T> =
    { kind: 'item'; item: T; isToday: boolean } | { kind: 'today'; date: string };

export const withToday = <T>(
    items: readonly T[],
    dateOf: (item: T) => string,
    today: string,
): TodayMarked<T>[] => {
    const marked = items.map((item): TodayMarked<T> => ({
        kind: 'item',
        item,
        isToday: dateOf(item) === today,
    }));
    if (marked.some((m) => m.kind === 'item' && m.isToday)) return marked;
    const after = items.findIndex((item) => dateOf(item) > today);
    const at = after === -1 ? items.length : after;
    return [...marked.slice(0, at), { kind: 'today', date: today }, ...marked.slice(at)];
};

export type StripTone = 'listed' | 'b1' | 'b2' | 'off' | 'gone';

export interface StripItem {
    span: EpisodeSpan;
    /** 已上架一段 = 最後一批嘅日子 */
    date: string;
    tone: StripTone;
}

/** 編輯模式上架時間軸：已上架一段灰格 + 每批（深淺相間）+ 今日 */
export const listingStrip = (
    plan: SchedulePlan,
    ctx: ScheduleContext,
    today: string,
): TodayMarked<StripItem>[] => {
    const { listed, planned } = listingTimeline(plan, ctx);
    const last = ctx.listed.at(-1);
    const items: StripItem[] = [
        ...(listed && last ? [{ span: listed, date: last.date, tone: 'listed' as const }] : []),
        ...planned.map((b, i) => ({
            span: { first: b.first, last: b.last },
            date: b.date,
            tone: i % 2 === 0 ? ('b1' as const) : ('b2' as const),
        })),
    ];
    return withToday(items, (item) => item.date, today);
};

/** 編輯模式下架時間軸：已下架（淡）+ 排程下架 + 今日；冇任何下架就冇時間軸 */
export const unlistStrip = (
    plan: SchedulePlan,
    ctx: ScheduleContext,
    today: string,
): TodayMarked<StripItem>[] => {
    const { removed, planned } = unlistTimeline(plan, ctx);
    const items: StripItem[] = [
        ...removed.map((r) => ({
            span: { first: r.first, last: r.last },
            date: r.date,
            tone: 'gone' as const,
        })),
        ...planned.map((r) => ({
            span: { first: r.first, last: r.last },
            date: r.date,
            tone: 'off' as const,
        })),
    ];
    return items.length === 0 ? [] : withToday(items, (item) => item.date, today);
};

/*
 * 短篇劇集頁嘅即將上架 / 快將下架資料（P8 #6，_mockups_/coming-soon）：
 * chips（即將上架排最尾、LK1 琥珀小標）、全集一覽表（S1 / A2 / LS2）、集數清單（摺埋批次、LE1）、
 * 成套劇快將下架嗰行。判斷喺 selectors/availability，字眼喺 i18n availability.*
 */
import type { ArcChip, UpcomingChip } from '../../components/pages/drama/ArcPicker/ArcPicker';
import type {
    ArcRowNotes,
    UpcomingArcRowView,
} from '../../components/pages/drama/ArcSheet/arcSheetTypes';
import type { EpisodeItem } from '../../components/shared/player/EpisodeList/EpisodeList';
import { t } from '../../i18n/t';
import type { ArcSummary } from '../../selectors/arcProgress';
import {
    arcLeaving,
    isLeavingSoon,
    pendingBatches,
    sameRemovalDay,
    upcomingArcs,
    type DateWindow,
    type UpcomingArc,
} from '../../selectors/availability';
import {
    dayWhen,
    joinWithSeparator,
    releaseWhen,
    removalWhen,
    spokenRelease,
    spokenRemoval,
} from '../../selectors/availabilityLabels';
import type { ArcAvailability, EpisodeRange } from '../../types/drama';

const unavailableLabel = (name: string, date: string): string =>
    t('availability.unavailableLabel', { name, when: spokenRelease(date) });

/** 即將上架 chips（排最尾）：「12/11 上架」/「明日上架」 */
export const upcomingChipsOf = (arcs: readonly ArcAvailability[], today: string): UpcomingChip[] =>
    upcomingArcs(arcs, today).map(({ arc, addedAt }) => ({
        arc,
        text: releaseWhen(addedAt, today, 'short'),
        label: unavailableLabel(arc, addedAt),
    }));

const upcomingStatus = ({ addedAt, count }: UpcomingArc, today: string): string => {
    const when = releaseWhen(addedAt, today, 'long');
    // 集數未知（drama.json 未寫 episodes）就淨係講日子
    if (count === undefined) return when;
    return joinWithSeparator([when, t('availability.arcEpisodeCount', { count })]);
};

/** 即將上架行讀屏（F4）：「XXX，02/12 星期三 上架，20 集」；集數未知就唔講 */
const upcomingLabel = ({ arc, addedAt, count }: UpcomingArc): string =>
    count === undefined
        ? unavailableLabel(arc, addedAt)
        : t('availability.upcomingArcLabel', { name: arc, when: spokenRelease(addedAt), count });

/** 全集一覽表「即將上架」組（S1）；cover = 短篇碟面（冇就劇集碟面） */
export const upcomingRowsOf = (
    arcs: readonly ArcAvailability[],
    today: string,
    coverOf: (arc: string) => string,
): UpcomingArcRowView[] =>
    upcomingArcs(arcs, today).map((upcoming) => ({
        arc: upcoming.arc,
        cover: coverOf(upcoming.arc),
        pill: dayWhen(upcoming.addedAt, today),
        status: upcomingStatus(upcoming, today),
        label: upcomingLabel(upcoming),
    }));

/**
 * chip 琥珀小標（LK1）：只係短篇自己快將下架先出；成套劇同日或者更早落架就唔重覆
 *（成套劇嘅由「全集」chip / 唱片下面講一次）
 */
export const chipLeavingOf = (
    arc: ArcAvailability,
    today: string,
    dramaRemovedAt?: string,
): ArcChip['leaving'] => {
    const leaving = arcLeaving(arc, today);
    if (leaving?.scope !== 'arc') return undefined;
    if (sameRemovalDay(dramaRemovedAt, leaving.date)) return undefined;
    // E2：chips 一行可以左右掃，位一定夠，小標連「下架」
    return { tag: removalWhen(leaving.date, today, 'short'), label: spokenRemoval(leaving.date) };
};

/** 部分集數下架嗰截：一段就講「第 1 至 5 集 …」，幾段就講「部分集數 …」 */
const rangeText = (when: string, first: number | undefined, last: number | undefined) =>
    first === undefined
        ? t('availability.leavingEpisodes', { when })
        : t('availability.leavingRange', { first, last: last ?? first, when });

/**
 * 一覽表行快將下架嘅字同膠囊（LS2）：短篇「05/12 下架」；集數「第 1 至 5 集 05/12 下架」；
 * 讀屏用讀屏日子（spoken）
 */
const leavingNotes = (arc: ArcAvailability, today: string) => {
    const leaving = arcLeaving(arc, today);
    if (!leaving) return undefined;
    const when = removalWhen(leaving.date, today, 'short');
    const spokenWhen = spokenRemoval(leaving.date);
    if (leaving.scope === 'arc')
        return { suffix: when, spoken: spokenWhen, badge: t('availability.leavingBadge') };
    const { first, last } = leaving;
    return {
        suffix: rangeText(when, first, last),
        spoken: rangeText(spokenWhen, first, last),
        badge: t('availability.leavingBadgePartial'),
    };
};

/** 一覽表行有下一批未上架（A2）：膠囊計全部集數、講第幾集起幾時上架；聽晒已上架就講聽到第幾集 */
const batchNotes = (arc: ArcAvailability, s: ArcSummary, lastNo: number, today: string) => {
    const [next] = pendingBatches(arc, today);
    if (!next || arc.count === undefined) return undefined;
    const when = releaseWhen(next.date, today, 'short');
    return {
        total: arc.count,
        suffix: t('availability.nextBatch', { no: next.first, when }),
        spoken: t('availability.nextBatch', { no: next.first, when: spokenRelease(next.date) }),
        status: s.state === 'done' ? t('availability.caughtUp', { no: lastNo }) : undefined,
    };
};

/** 一覽表一行嘅上架 / 下架補充；兩樣都冇就 undefined（行同以前一樣）。lastNo = 已上架最後一集 */
export const arcNotesOf = (
    arc: ArcAvailability,
    s: ArcSummary,
    lastNo: number,
    today: string,
): ArcRowNotes | undefined => {
    const batch = batchNotes(arc, s, lastNo, today);
    const leaving = leavingNotes(arc, today);
    if (!batch && !leaving) return undefined;
    return {
        ...(batch && { total: batch.total }),
        ...(batch?.status && { status: batch.status }),
        suffixes: [batch?.suffix, leaving?.suffix].filter((x): x is string => x !== undefined),
        spokenSuffixes: [batch?.spoken, leaving?.spoken].filter(
            (x): x is string => x !== undefined,
        ),
        ...(leaving && { badge: leaving.badge }),
    };
};

const batchItem = (arc: string, batch: EpisodeRange, today: string): EpisodeItem => {
    const range = { first: batch.first, last: batch.last };
    return {
        key: `batch:${arc}:${batch.first}`,
        dayMonth: t('availability.batchTitle', range),
        weekday: '',
        current: false,
        isPlaying: false,
        status: { kind: 'upcoming', ratio: 0, text: releaseWhen(batch.date, today, 'long') },
        episodeCount: batch.last - batch.first + 1,
        label: unavailableLabel(t('availability.batchTitle', range), batch.date),
    };
};

/** 集數清單尾：未上架嘅集數按批摺埋，一批一行（撳唔到）；長版日子 */
export const batchItemsOf = (arc: ArcAvailability, today: string): EpisodeItem[] =>
    pendingBatches(arc, today).map((batch) => batchItem(arc.arc, batch, today));

/** 集數清單一行（LE1）：呢集喺快將下架嘅集數範圍入面先出 */
export const episodeLeavingOf = (
    arc: ArcAvailability,
    no: number,
    today: string,
): EpisodeItem['leaving'] => {
    const range = arc.removals.find((r) => no >= r.first && no <= r.last);
    if (!range || !isLeavingSoon(range.date, today)) return undefined;
    return {
        text: removalWhen(range.date, today, 'short'),
        tag: dayWhen(range.date, today),
        label: spokenRemoval(range.date),
    };
};

/**
 * 成套劇快將下架（D2「本廣播劇系列 …」）：劇集頁唱片下面 / chips 上面、一覽表表頭都係 page；
 * 「全集」chip 小標 tag（「05/12 下架」）；讀屏 label（「本廣播劇系列 05/12 星期六 下架」）
 */
export const dramaNoticeOf = (
    drama: DateWindow,
    today: string,
): { page: string; tag: string; label: string } | undefined => {
    const { removedAt } = drama;
    if (!removedAt || !isLeavingSoon(removedAt, today)) return undefined;
    return {
        page: t('availability.dramaLeavingLine', { when: removalWhen(removedAt, today, 'long') }),
        tag: removalWhen(removedAt, today, 'short'),
        label: t('availability.dramaLeavingLine', { when: spokenRemoval(removedAt) }),
    };
};

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
    releaseDateLong,
    releaseWhen,
    removalDateLong,
    removalWhen,
} from '../../selectors/availabilityLabels';
import type { ArcAvailability, EpisodeRange } from '../../types/drama';

const unavailableLabel = (name: string, date: string): string =>
    t('availability.unavailableLabel', { name, when: releaseDateLong(date) });

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
    return count === undefined ? when : t('availability.upcomingArcCount', { when, count });
};

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
        label: unavailableLabel(upcoming.arc, upcoming.addedAt),
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
    return { tag: dayWhen(leaving.date, today), label: removalDateLong(leaving.date) };
};

/** 一覽表行快將下架嘅字同膠囊（LS2）：短篇「05/12 下架」；集數「第 1–5 集 05/12 下架」 */
const leavingNotes = (arc: ArcAvailability, today: string) => {
    const leaving = arcLeaving(arc, today);
    if (!leaving) return undefined;
    const when = removalWhen(leaving.date, today, 'short');
    if (leaving.scope === 'arc') return { suffix: when, badge: t('availability.leavingBadge') };
    const { first, last } = leaving;
    const suffix =
        first === undefined
            ? t('availability.leavingEpisodes', { when })
            : t('availability.leavingRange', { first, last: last ?? first, when });
    return { suffix, badge: t('availability.leavingBadgePartial') };
};

/** 一覽表行有下一批未上架（A2）：膠囊計全部集數、講第幾集起幾時上架；聽晒已上架就講聽到第幾集 */
const batchNotes = (arc: ArcAvailability, s: ArcSummary, lastNo: number, today: string) => {
    const [next] = pendingBatches(arc, today);
    if (!next || arc.count === undefined) return undefined;
    const when = releaseWhen(next.date, today, 'short');
    return {
        total: arc.count,
        suffix: t('availability.nextBatch', { no: next.first, when }),
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
        label: unavailableLabel(t('availability.batchLabel', range), batch.date),
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
        label: removalDateLong(range.date),
    };
};

/** 成套劇快將下架：劇集頁唱片下面嗰行（page）、一覽表表頭下面（sheet） */
export const dramaNoticeOf = (
    drama: DateWindow,
    today: string,
): { page: string; sheet: string; tag: string; label: string } | undefined => {
    const { removedAt } = drama;
    if (!removedAt || !isLeavingSoon(removedAt, today)) return undefined;
    const when = removalWhen(removedAt, today, 'long');
    return {
        page: t('availability.dramaLeavingLine', { when }),
        sheet: t('availability.sheetLeavingLine', { when }),
        tag: dayWhen(removedAt, today),
        label: removalDateLong(removedAt),
    };
};

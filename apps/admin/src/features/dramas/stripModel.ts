/*
 * 排程 tab 嘅固定部分（_mockups_/admin-schedule-unlist ⑧）：由 definition 讀「已上架批次」（日子 ≤ 今日，唔改得）
 * 同「已經過咗下架日」嘅下架（照留，mockup ⑤）；短篇 tab 細字
 */
import { batchesOf, type ArcSchedule } from '@903-player/catalog';
import type { RawDefinition } from '../../api/types';
import { t } from '../../i18n/t';
import { countOf, firstNoOf, isRecord, str } from '../../model/raw';
import type { ScheduleContext } from './scheduleModel';

export const spanOf = (arc: RawDefinition) => ({ firstNo: firstNoOf(arc), count: countOf(arc) });

/** definition 而家嘅上架日（短篇 addedAt，冇就跟劇集） */
export const currentScheduleOf = (drama: RawDefinition, arc: RawDefinition): ArcSchedule => ({
    addedAt: str(arc, 'addedAt') ?? str(drama, 'addedAt'),
    episodeDates: isRecord(arc.episodeDates)
        ? (arc.episodeDates as Record<string, string>)
        : undefined,
});

/**
 * 下架（enabled: false）又冇排程嘅短篇未上過架：掃描新短篇嘅 addedAt = 掃描當日，唔係上架日；
 * player（arcAvailabilityOf）亦唔出下架短篇。有排程就照排程日子
 */
export const isUnreleased = (arc: RawDefinition, scheduled: boolean) =>
    arc.enabled === false && !scheduled;

/** episodeRemovedAt 入面下架日 ≤ 今日嘅：已經落咗架，新規則唔郁 */
const pastRemovals = (arc: RawDefinition, today: string): Record<string, string> =>
    isRecord(arc.episodeRemovedAt)
        ? Object.fromEntries(
              Object.entries(arc.episodeRemovedAt).filter(
                  (entry): entry is [string, string] =>
                      typeof entry[1] === 'string' && entry[1] <= today,
              ),
          )
        : {};

export const scheduleContextOf = (
    drama: RawDefinition,
    arc: RawDefinition,
    today: string,
    scheduled = false,
): ScheduleContext => {
    const span = spanOf(arc);
    const base = { ...span, today };
    if (isUnreleased(arc, scheduled)) return { ...base, listed: [], unlisted: {} };
    return {
        ...base,
        listed: batchesOf(currentScheduleOf(drama, arc), span).filter((b) => b.date <= today),
        unlisted: pastRemovals(arc, today),
    };
};

/** 短篇 tab 細字：無排程 / 已上 X / Y 集 / 已全部上架（mockup ①）/ 定期（未開始上架） */
export const arcTabNote = (
    drama: RawDefinition,
    arc: RawDefinition,
    hasRule: boolean,
    today: string,
) => {
    if (!hasRule) return t('schedule.none');
    const released = scheduleContextOf(drama, arc, today, hasRule).listed.reduce(
        (sum, b) => sum + b.last - b.first + 1,
        0,
    );
    const count = countOf(arc);
    if (count > 0 && released >= count) return t('schedule.allListedNote');
    return released > 0 ? t('schedule.released', { released, count }) : t('schedule.periodic');
};

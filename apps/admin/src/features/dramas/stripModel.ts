/*
 * 集數條（mockup ⑩ C）：第一行 = 已上架批次（灰 ✓），由「今天」換行顯示新規則排出嚟嘅批次；
 * 舊批次同新規則排法唔同 → 批次表（packages/catalog batches）
 */
import {
    batchesOf,
    compareBatches,
    type ArcSchedule,
    type BatchComparison,
    type EpisodeRange,
    type ExpandedSchedule,
} from '@903-player/catalog';
import type { RawDefinition } from '../../api/types';
import { t } from '../../i18n/t';
import { countOf, firstNoOf, isRecord, str } from '../../model/raw';

export const spanOf = (arc: RawDefinition) => ({ firstNo: firstNoOf(arc), count: countOf(arc) });

/** definition 而家嘅上架日（短篇 addedAt，冇就跟劇集） */
export const currentScheduleOf = (drama: RawDefinition, arc: RawDefinition): ArcSchedule => ({
    addedAt: str(arc, 'addedAt') ?? str(drama, 'addedAt'),
    episodeDates: isRecord(arc.episodeDates)
        ? (arc.episodeDates as Record<string, string>)
        : undefined,
});

export interface Strip {
    past: EpisodeRange[];
    future: EpisodeRange[];
    comparison: BatchComparison | null;
}

export const stripOf = (
    drama: RawDefinition,
    arc: RawDefinition,
    expanded: ExpandedSchedule | null,
    today: string,
): Strip => {
    const span = spanOf(arc);
    const current = currentScheduleOf(drama, arc);
    const plan = expanded ?? current;
    return {
        past: batchesOf(current, span).filter((b) => b.date <= today),
        future: batchesOf(plan, span).filter((b) => b.date > today),
        comparison: expanded ? compareBatches(current, expanded, span, today) : null,
    };
};

const sizeOf = (batch: EpisodeRange) => batch.last - batch.first + 1;

/** 短篇 tab 細字：無排程 / 已上 X / Y 集 / 定期 */
export const arcTabNote = (
    drama: RawDefinition,
    arc: RawDefinition,
    hasRule: boolean,
    today: string,
) => {
    if (!hasRule) return t('schedule.none');
    const released = stripOf(drama, arc, null, today).past.reduce((sum, b) => sum + sizeOf(b), 0);
    const count = countOf(arc);
    return released > 0 && released < count
        ? t('schedule.released', { released, count })
        : t('schedule.periodic');
};

export const batchSize = sizeOf;

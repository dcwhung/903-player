/*
 * 短篇顯示名（Phase 3）：arc.displayName 有就用，冇就 name。
 * 淨係 UI label 用；key / URL / episode ID 一律繼續用 name / id
 */

/** SeriesEpisode / ArcAvailability 都有 arc（= name）同 optional arcLabel */
export const arcLabelOf = (item: { arc: string; arcLabel?: string }): string =>
    item.arcLabel ?? item.arc;

/** displayName 有先帶 arcLabel（冇就唔出 key，舊資料嘅 object 一模一樣） */
export const arcLabelField = (arc: { displayName?: string }) =>
    arc.displayName === undefined ? {} : { arcLabel: arc.displayName };

/** 下架（enabled: false）嘅短篇唔顯示；冇寫 = 上架 */
export const isArcEnabled = (arc: { enabled?: boolean }): boolean => arc.enabled !== false;

/* 確認發佈 / 上下架記錄：summarizeChanges 結果 → 數量 pill、時間線文字 */
import type { ChangeItem, ChangeKind, ChangeSummary, ChangeWhen } from '@903-player/catalog';
import { t, type MessageKey } from '../../i18n/t';
import { shortDate } from '../../model/dates';

export const episodesIn = (item: ChangeItem): number => {
    const { episodes, dates } = item.detail;
    if (episodes) return episodes.last - episodes.first + 1;
    return dates?.length ?? 0;
};

const COUNT_KEYS: readonly [ChangeKind, MessageKey][] = [
    ['newShow', 'publish.countShows'],
    ['newDrama', 'publish.countDramas'],
    ['newArc', 'publish.countArcs'],
    ['newEpisodes', 'publish.countEpisodes'],
    ['edit', 'publish.countEdits'],
    ['unlist', 'publish.countUnlists'],
];

/** 頂部數量 pill：「＋1 廣播劇」「＋1 短篇」「＋2 集」… */
export const countPills = (summary: ChangeSummary): { kind: ChangeKind; label: string }[] =>
    COUNT_KEYS.flatMap(([kind, key]) => {
        const items = summary.items.filter((item) => item.kind === kind);
        const count =
            kind === 'newEpisodes'
                ? items.reduce((sum, item) => sum + episodesIn(item), 0)
                : items.length;
        return count > 0 ? [{ kind, label: t(key, { count }) }] : [];
    });

export const whenLabel = (when: ChangeWhen): string =>
    when === 'now' ? t('publish.now') : shortDate(when);

export const kindLabel = (kind: ChangeKind): string => t(`kind.${kind}`);

export const itemName = (item: ChangeItem): string => {
    if (item.kind === 'rollback')
        return t('history.rollbackTo', { id: item.detail.publishId ?? '' });
    const entry = item.entry?.name ?? '';
    return item.arc ? item.arc.label : entry;
};

/** 「39–40」；冇集數範圍就空 */
export const itemRange = (item: ChangeItem): string => {
    const range = item.detail.episodes;
    if (!range) return '';
    return range.first === range.last ? String(range.first) : `${range.first}–${range.last}`;
};

/* 確認發佈 / 上下架記錄：summarizeChanges 結果 → 統計數字、時間線文字 */
import type {
    CatalogKind,
    ChangeItem,
    ChangeKind,
    ChangeSummary,
    ChangeWhen,
} from '@903-player/catalog';
import { t } from '../../i18n/t';
import { shortDate } from '../../model/dates';

export const episodesIn = (item: ChangeItem): number => {
    const { episodes, dates } = item.detail;
    if (episodes) return episodes.last - episodes.first + 1;
    return dates?.length ?? 0;
};

/** 確認發佈統計卡：新增（節目 / 劇 / 短篇）、新集數、修改（包括排序，#6）、下架 */
export const publishStats = (summary: ChangeSummary) => {
    const count = (kinds: readonly ChangeKind[]) =>
        summary.items.filter((item) => kinds.includes(item.kind)).length;
    return {
        added: count(['newShow', 'newDrama', 'newArc']),
        episodes: summary.items
            .filter((item) => item.kind === 'newEpisodes')
            .reduce((sum, item) => sum + episodesIn(item), 0),
        edits: count(['edit', 'reorder']),
        unlists: count(['unlist']),
    };
};

export const whenLabel = (when: ChangeWhen): string =>
    when === 'now' ? t('publish.now') : shortDate(when);

export const kindLabel = (kind: ChangeKind): string => t(`kind.${kind}`);

/** 「節目」/「廣播劇」（排序改動、還原掣用） */
export const listName = (list: CatalogKind): string => t(`list.${list}`);

/** 「節目排序已更改」/「廣播劇排序已更改」（#6：成個列表一個 item，冇 entry） */
export const reorderTitle = (item: ChangeItem): string =>
    t('publish.reordered', { list: listName(item.detail.list ?? 'shows') });

export const itemName = (item: ChangeItem): string => {
    if (item.kind === 'reorder') return reorderTitle(item);
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

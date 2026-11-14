/* 上下架記錄：每項變更嘅狀態 pill（用返內容列表嘅 pill 字眼） */
import type { ChangeItem } from '@903-player/catalog';
import type { LoadedEntry, PublishChangeSummary } from '../../api/types';
import { t } from '../../i18n/t';
import { longDate } from '../../model/dates';
import type { Status } from '../../model/status';
import { editFieldsText } from '../update/changeFields';
import { episodesIn } from '../update/timelineModel';

const scheduled = (item: ChangeItem): Status => {
    const date = longDate(item.when);
    const multiple = (item.detail.dates?.length ?? 0) > 1;
    return {
        tone: 'info',
        text: t(multiple ? 'status.scheduledFrom' : 'status.upcoming', { date }),
    };
};

/** 修改：改了哪些欄位，同確認發佈頁一樣（editFieldsText，短篇寫短篇名） */
export const itemStatusOf = (
    item: ChangeItem,
    entries: readonly LoadedEntry[],
): Status | undefined => {
    if (item.kind === 'rollback') return undefined;
    if (item.kind === 'unlist')
        return {
            tone: 'bad',
            text:
                item.when === 'now'
                    ? t('status.off')
                    : t('status.offOn', { date: longDate(item.when) }),
        };
    if (item.kind === 'edit')
        return {
            tone: 'none',
            text: editFieldsText(item, entries) || t('kind.edit'),
        };
    if (item.when !== 'now') return scheduled(item);
    if (item.kind === 'newEpisodes')
        return { tone: 'ok', text: t('status.addedEpisodes', { count: episodesIn(item) }) };
    return { tone: 'ok', text: t('status.live') };
};

/** 「黃金少年 › Season 1」 */
export const historyName = (item: ChangeItem): string => {
    if (item.kind === 'rollback')
        return t('history.rollbackTo', { id: item.detail.publishId ?? '' });
    const entry = item.entry?.name ?? '';
    return item.arc ? `${entry} › ${item.arc.label}` : entry;
};

/** 呢次 publish 有冇換首頁 Banner（欄位冇 = 舊 api / 舊記錄，當冇換） */
export const bannerChangedOf = (changes: PublishChangeSummary | undefined): boolean =>
    changes?.bannerChanged === true;

/** 呢次 publish 有冇改 App 外觀（圖示 / 名稱與簡介） */
export const brandingChangedOf = (changes: PublishChangeSummary | undefined): boolean =>
    changes?.brandingChanged === true;

/**
 * 「N 節目 · N 劇 · N 集」只喺改咗節目 / 劇內容先顯示（用戶 2026-11-13）：淨換 Banner / App 外觀唔顯示。
 * 冇 change summary（舊記錄）唔知改咗乜，照舊顯示
 */
export const contentChangedOf = (changes: PublishChangeSummary | undefined): boolean =>
    changes === undefined || changes.items.length > 0;

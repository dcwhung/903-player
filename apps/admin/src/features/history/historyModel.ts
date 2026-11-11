/* 上下架記錄：每項變更嘅狀態 pill（用返內容列表嘅 pill 字眼） */
import type { ChangeItem } from '@903-player/catalog';
import { t } from '../../i18n/t';
import { zhHK } from '../../i18n/zh-HK';
import { longDate } from '../../model/dates';
import type { Status } from '../../model/status';
import { episodesIn } from '../update/timelineModel';

const fieldLabel = (field: string): string =>
    field in zhHK.fields ? t(`fields.${field as keyof typeof zhHK.fields}`) : field;

const scheduled = (item: ChangeItem): Status => {
    const date = longDate(item.when);
    const multiple = (item.detail.dates?.length ?? 0) > 1;
    return {
        tone: 'info',
        text: t(multiple ? 'status.scheduledFrom' : 'status.upcoming', { date }),
    };
};

export const itemStatusOf = (item: ChangeItem): Status | undefined => {
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
            text: (item.detail.fields ?? []).map(fieldLabel).join('、') || t('kind.edit'),
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

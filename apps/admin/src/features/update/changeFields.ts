/*
 * 「修改」項目改了哪些欄位：summarizeChanges 的 detail.fields（頂層 key、`images`、`arcs.<短篇>.<key>`）
 * → 「配色、簡介；戀愛二分一：簡介、聲演」。標籤跟編輯頁（fields.*），未有的用 changeFields.*，認不到就「其他」
 */
import type { ChangeItem } from '@903-player/catalog';
import type { LoadedEntry } from '../../api/types';
import { t, type MessageKey } from '../../i18n/t';
import { arcsOf, str } from '../../model/raw';

const FIELD_SEPARATOR = '、';
/** 頂層欄位同各短篇之間 */
const GROUP_SEPARATOR = '；';
const ARC_FIELD = /^arcs\.(.+)\.([^.]+)$/;
/**
 * 短篇 `episodes` 只會喺集數不變、集名 list 改咗先報（集數變咗係「新集數」，見 catalog arcEditFields），
 * 所以當「各集標題」（W-742）
 */
const ARC_KEY_ALIASES: Readonly<Record<string, string>> = { episodes: 'titles' };

const EDITOR_FIELDS = [
    'name',
    'summary',
    'airDays',
    'airTime',
    'hosts',
    'kind',
    'addedAt',
    'displayName',
    'cast',
    'titles',
    'fileTime',
    'images',
    'audio',
] as const;
const CHANGE_FIELDS = [
    'tile',
    'disc',
    'theme',
    'order',
    'arcUnit',
    'firstNo',
    'files',
    'episodeRemovedAt',
] as const;

const labelKeyOf = (key: string): MessageKey => {
    if ((EDITOR_FIELDS as readonly string[]).includes(key))
        return `fields.${key as (typeof EDITOR_FIELDS)[number]}`;
    if ((CHANGE_FIELDS as readonly string[]).includes(key))
        return `changeFields.${key as (typeof CHANGE_FIELDS)[number]}`;
    return 'fields.other';
};

const unique = (labels: readonly string[]): string[] => [...new Set(labels)];

/** 短篇 key（catalog arcIdOf：id，冇就用名）→ 短篇名；搵唔到就用 key */
const arcNameOf = (item: ChangeItem, entries: readonly LoadedEntry[], arcKey: string): string => {
    const entry = entries.find((e) => e.kind === item.entry?.kind && e.id === item.entry.id);
    const arc =
        entry && arcsOf(entry.definition).find((a) => (str(a, 'id') ?? str(a, 'name')) === arcKey);
    return (arc && str(arc, 'name')) ?? arcKey;
};

/** 頂層欄位標籤 + 每個短篇一句「短篇名：欄位、欄位」（舊格式 `arcs.<短篇>.<key>`） */
const fieldGroups = (item: ChangeItem, entries: readonly LoadedEntry[]) => {
    const top: string[] = [];
    const byArc = new Map<string, string[]>();
    for (const field of item.detail.fields ?? []) {
        const arc = ARC_FIELD.exec(field);
        if (arc) {
            const [, arcKey = '', key = ''] = arc;
            const label = t(labelKeyOf(ARC_KEY_ALIASES[key] ?? key));
            byArc.set(arcKey, [...(byArc.get(arcKey) ?? []), label]);
        } else {
            // 短篇自己嘅 edit（有 arc ref）：欄位係短篇 key，`episodes` 一樣當各集標題
            const key = item.arc ? (ARC_KEY_ALIASES[field] ?? field) : field;
            top.push(t(labelKeyOf(key)));
        }
    }
    const arcs = [...byArc].map(([arcKey, labels]) =>
        t('changeFields.arc', {
            arc: arcNameOf(item, entries, arcKey),
            fields: unique(labels).join(FIELD_SEPARATOR),
        }),
    );
    return { top: unique(top), arcs };
};

/** 時間線 chip：每個頂層欄位一粒，每個短篇一粒；「修改」以外 = 冇 */
export const editFieldChips = (item: ChangeItem, entries: readonly LoadedEntry[]): string[] => {
    if (item.kind !== 'edit') return [];
    const { top, arcs } = fieldGroups(item, entries);
    return [...top, ...arcs];
};

/** 「修改」以外、或者冇欄位 → 空字串 */
export const editFieldsText = (item: ChangeItem, entries: readonly LoadedEntry[]): string => {
    if (item.kind !== 'edit') return '';
    const { top, arcs } = fieldGroups(item, entries);
    const head = top.join(FIELD_SEPARATOR);
    return [...(head ? [head] : []), ...arcs].join(GROUP_SEPARATOR);
};

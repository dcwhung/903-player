/*
 * 確認發佈時間線（B v2）：Design Origin: mockup: _mockups_/admin-publish-summary/index.html
 * 每組（即時 / 日子）入面按劇 / 節目分卡（第一次出現嘅次序），卡內逐行：劇本身嘅改動、各短篇
 */
import type { ChangeEntryRef, ChangeItem, ChangeKind, ChangeWhen } from '@903-player/catalog';
import { hkToday } from '@903-player/catalog';
import type { LoadedEntry } from '../../api/types';
import { t } from '../../i18n/t';
import { fullDate, weekdayName } from '../../model/dates';
import { episodeTotalOf } from '../../model/thumbs';
import { episodesIn, itemRange } from './timelineModel';

export interface EntryCard {
    /** `<kind>/<id>`；冇 entry（還原）= 自己一張卡 */
    key: string;
    entry: ChangeEntryRef | undefined;
    items: ChangeItem[];
}

const cardKeyOf = (item: ChangeItem, index: number): string =>
    item.entry ? `${item.entry.kind}/${item.entry.id}` : `${item.kind}#${index}`;

export const entryCardsOf = (items: readonly ChangeItem[]): EntryCard[] => {
    const cards = new Map<string, EntryCard>();
    items.forEach((item, index) => {
        const key = cardKeyOf(item, index);
        const card = cards.get(key);
        if (card) card.items.push(item);
        else cards.set(key, { key, entry: item.entry, items: [item] });
    });
    return [...cards.values()];
};

const NEW_ENTRY_KINDS: ReadonlySet<ChangeKind> = new Set(['newShow', 'newDrama']);
const EPISODE_KINDS: ReadonlySet<ChangeKind> = new Set(['newArc', 'newEpisodes']);

/** 卡內嘅行：新劇 / 新節目一行就夠（「全 N 集」已包同組嘅新短篇 / 新集數） */
export const cardRows = (card: EntryCard): ChangeItem[] =>
    card.items.some((item) => NEW_ENTRY_KINDS.has(item.kind))
        ? card.items.filter((item) => !EPISODE_KINDS.has(item.kind))
        : card.items;

/** 類型 tag 顏色：new = ok、edit = warn、off = danger、look = accent（App 外觀 / 還原） */
export type TagTone = 'new' | 'edit' | 'off' | 'look';

const TONES: Readonly<Record<ChangeKind, TagTone>> = {
    newShow: 'new',
    newDrama: 'new',
    newArc: 'new',
    newEpisodes: 'new',
    edit: 'edit',
    unlist: 'off',
    rollback: 'look',
};

export const toneOf = (kind: ChangeKind): TagTone => TONES[kind];

export interface GroupHeading {
    label: string;
    sub: string;
}

/** 「即時上線 · 按「發佈」後」/「11 月 16 日 · 星期一」 */
export const groupHeading = (when: ChangeWhen, today: string = hkToday()): GroupHeading =>
    when === 'now'
        ? { label: t('publish.now'), sub: t('publish.nowSub') }
        : {
              label: fullDate(when, today),
              sub: t('publish.weekday', { weekday: weekdayName(when) }),
          };

/** 新劇 / 新節目只寫 tag（成張卡就係佢） */
const WHOLE_ENTRY_KINDS: ReadonlySet<ChangeKind> = new Set(['newShow', 'newDrama', 'rollback']);

/** 劇本身嘅行寫「劇集」/「節目」；短篇行、新劇 / 新節目 = 空 */
export const rowLevel = (item: ChangeItem): string => {
    if (item.arc || WHOLE_ENTRY_KINDS.has(item.kind)) return '';
    return t(item.entry?.kind === 'shows' ? 'publish.levelShow' : 'publish.levelDrama');
};

/** 行尾：新劇「全 N 集」、短篇「第 39–40 集」、每日劇「N 集」；其他 = 空 */
export const rowExtra = (item: ChangeItem, entries: readonly LoadedEntry[]): string => {
    if (item.kind === 'newDrama') return t('publish.all', { count: episodeTotalOf(entries, item) });
    const range = itemRange(item);
    if (range) return t('publish.episodeRange', { range });
    if (item.kind === 'newEpisodes') return t('publish.episodeCount', { count: episodesIn(item) });
    return '';
};

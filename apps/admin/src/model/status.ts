/*
 * 列表狀態（mockup ⑤ legend）：縮圖角點 = 主項狀態（綠 上架中 / 藍 上架日期未到 / 紅 已下架 / 灰 未上架）；
 * 短篇 pill = 已上架 / 排程中 / 日期上架 / 已下架 / 部分下架 / 未上架。
 * 未上架 = 下架（enabled: false）而從未上過架（GET /api/entries 嘅 published / publishedArcs）；
 * published 未知（舊 API）就照舊當已下架
 */
import type { EntryKind, RawDefinition } from '../api/types';
import { t } from '../i18n/t';
import { longDate } from './dates';
import { countOf, firstNoOf, isRecord, str } from './raw';

export type Dot = 'live' | 'soon' | 'off' | 'unlisted';
export type Tone = 'ok' | 'info' | 'bad' | 'part' | 'unlisted' | 'none';

export interface Status {
    tone: Tone;
    text: string;
}

const isPast = (date: string | undefined, today: string) => date !== undefined && date <= today;
const isFuture = (date: string | undefined, today: string) => date !== undefined && date > today;

/** published 明確係 false 先算從未上架（undefined = 唔知，當上過） */
const neverListed = (published: boolean | undefined) => published === false;

const UNLISTED: () => Status = () => ({ tone: 'unlisted', text: t('status.unlisted') });
const OFF: () => Status = () => ({ tone: 'bad', text: t('status.off') });

export const entryDotOf = (
    kind: EntryKind,
    definition: RawDefinition,
    draft: boolean,
    today: string,
    published?: boolean,
): Dot => {
    const offDot = neverListed(published) ? 'unlisted' : 'off';
    if (kind === 'shows') return definition.enabled === false ? offDot : 'live';
    if (draft) return 'soon';
    if (definition.enabled !== true) return offDot;
    if (isPast(str(definition, 'removedAt'), today)) return 'off';
    return isFuture(str(definition, 'addedAt'), today) ? 'soon' : 'live';
};

/** 節目列表 / 編輯頁 pill：上架中 / 已下架 / 未上架 */
export const showStatusOf = (definition: RawDefinition, published: boolean | undefined): Status => {
    if (definition.enabled !== false) return { tone: 'ok', text: t('status.showLive') };
    return neverListed(published) ? UNLISTED() : OFF();
};

/** 每集上架日：劇集 addedAt、短篇 addedAt、逐集批次最遲嗰個 */
const releaseDates = (drama: RawDefinition, arc: RawDefinition): string[] => {
    const batches = isRecord(arc.episodeDates) ? arc.episodeDates : {};
    const starts = Object.entries(batches)
        .filter((e): e is [string, string] => typeof e[1] === 'string')
        .map(([no, date]) => ({ from: Number(no), date }))
        .sort((a, b) => a.from - b.from);
    const base = [str(drama, 'addedAt'), str(arc, 'addedAt')].filter((d) => d !== undefined);
    const first = firstNoOf(arc);
    return Array.from({ length: countOf(arc) }, (_, i) => {
        const batch = starts.filter((s) => s.from <= first + i).at(-1)?.date;
        return [...base, batch ?? ''].sort().at(-1) ?? '';
    });
};

/** 已經過咗下架日嘅集數 */
const removedCount = (arc: RawDefinition, today: string): { count: number; date?: string } => {
    const ranges = isRecord(arc.episodeRemovedAt) ? Object.entries(arc.episodeRemovedAt) : [];
    const past = ranges.filter(([, date]) => typeof date === 'string' && date <= today);
    const count = past.reduce((sum, [key]) => {
        const [a = 0, b = a] = key.split('-').map(Number);
        return sum + (b - a + 1);
    }, 0);
    return { count, date: past.map(([, d]) => String(d)).sort()[0] };
};

const releaseStatus = (dates: string[], today: string): Status => {
    const released = dates.filter((d) => d <= today).length;
    const upcoming = [...new Set(dates.filter((d) => d > today))].sort();
    const first = upcoming[0];
    if (first === undefined) return { tone: 'ok', text: t('status.live') };
    if (released > 0)
        return {
            tone: 'info',
            text: t('status.scheduledProgress', { released, count: dates.length }),
        };
    const date = longDate(first);
    const key = upcoming.length > 1 ? 'status.scheduledFrom' : 'status.upcoming';
    return { tone: 'info', text: t(key, { date }) };
};

export interface ArcPublishFacts {
    /** 從未發佈嘅新短篇（變更摘要 newArc / placeholder ID / 劇未發佈過） */
    isNew?: boolean;
    /** 最新 ok publish 有冇上過架；undefined = 唔知 */
    published?: boolean | undefined;
}

export const arcStatusOf = (
    drama: RawDefinition,
    arc: RawDefinition,
    today: string,
    { isNew = false, published }: ArcPublishFacts = {},
): Status => {
    if (arc.enabled === false) return isNew || neverListed(published) ? UNLISTED() : OFF();
    const removedAt = str(arc, 'removedAt');
    if (isPast(removedAt, today))
        return { tone: 'bad', text: t('status.offOn', { date: longDate(removedAt ?? '') }) };
    const removed = removedCount(arc, today);
    const total = countOf(arc);
    if (removed.count > 0 && removed.count >= total)
        return { tone: 'bad', text: t('status.offOn', { date: longDate(removed.date ?? '') }) };
    if (removed.count > 0)
        return { tone: 'part', text: t('status.partOff', { count: total - removed.count }) };
    return releaseStatus(releaseDates(drama, arc), today);
};

/** 每日播（冇短篇）：跟劇集上架 / 下架 */
export const dailyStatusOf = (drama: RawDefinition, today: string, published?: boolean): Status => {
    if (drama.enabled !== true) return neverListed(published) ? UNLISTED() : OFF();
    const addedAt = str(drama, 'addedAt');
    if (isFuture(addedAt, today))
        return { tone: 'info', text: t('status.upcoming', { date: longDate(addedAt ?? '') }) };
    return { tone: 'ok', text: t('status.live') };
};

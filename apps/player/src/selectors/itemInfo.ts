/*
 * 節目 / 劇集資料（P9.5 #12，.proj-docs/plans/2026-11-16_plan_item-info.md）：
 * 有冇資料、資料 sheet 每段內容、第一次入自動彈唔彈。缺邊項就唔出邊項（唔寫「未有資料」）
 */
import {
    EPISODE_ID_KIND,
    formatAirDays,
    type AirTime,
    type ArcInfo,
    type Drama,
    type ShowConfig,
    type Weekday,
} from '@903-player/catalog';
import type { Progress } from '../services/progressStore';
import type { ArcState } from './arcProgress';

/** 判斷「有資料」嘅欄位（airDays 本身唔計） */
export interface InfoFields {
    summary?: string | undefined;
    hosts?: readonly string[] | undefined;
    cast?: readonly string[] | undefined;
    airTime?: AirTime | undefined;
}

/** 資料 sheet 一段（節目 / 劇集 / 短篇）：標題 + 有嘅欄位 */
/** 資料 sheet 段落類型：節目 / 劇集 / 短篇（React key、短篇標題細啲） */
export type ItemInfoSectionKind = 'show' | 'drama' | 'arc';

export interface ItemInfoSection {
    kind: ItemInfoSectionKind;
    title: string;
    /** 播放時間顯示字（formatPlayTime） */
    airTime?: string;
    hosts?: readonly string[];
    cast?: readonly string[];
    summary?: string;
}

/** 列表每行展開嘅資料（全集 sheet 短篇行、今日節目行）：冇標題 */
export type InlineInfo = Omit<ItemInfoSection, 'kind' | 'title'>;

type ProgressMap = Readonly<Record<string, Progress>>;

const hasNames = (names: readonly string[] | undefined): names is readonly string[] =>
    names !== undefined && names.length > 0;

/** summary / hosts / cast / airTime 任何一項有 */
export const hasItemInfo = (fields: InfoFields): boolean =>
    Boolean(fields.summary) ||
    hasNames(fields.hosts) ||
    hasNames(fields.cast) ||
    fields.airTime !== undefined;

/** 已經砌好嘅行資料（冇值嘅欄位唔出 key）有冇嘢 */
export const hasInlineInfo = (info: InlineInfo): boolean => Object.keys(info).length > 0;

/** 冇值就唔出 key（同 catalog registry 一樣） */
const field = <K extends string, V>(key: K, value: V | undefined) =>
    (value === undefined ? {} : { [key]: value }) as Partial<Record<K, V>>;

const namesField = <K extends 'hosts' | 'cast'>(key: K, names: readonly string[] | undefined) =>
    field(key, hasNames(names) ? names : undefined);

/** formatAirDays 七日都播嘅字：前面唔加「逢」 */
const EVERY_DAY_TEXT = formatAirDays([0, 1, 2, 3, 4, 5, 6]);
const PLAY_TIME_PREFIX = '逢';
const PLAY_TIME_SUFFIX = '播放';

/**
 * player 資料 sheet / 今日節目行嘅播放時間：「逢星期六（23:00 - 23:45）播放」「逢星期六播放」
 * 「每日（06:00 - 09:00）播放」。catalog formatAirTime 係 admin 用嘅短字，唔改佢
 */
export const formatPlayTime = (
    airDays: readonly Weekday[],
    airTime: AirTime | undefined,
): string | undefined => {
    if (airDays.length === 0) return undefined;
    const days = formatAirDays(airDays);
    const prefix = days === EVERY_DAY_TEXT ? '' : PLAY_TIME_PREFIX;
    const time = airTime ? `（${airTime.start} - ${airTime.end}）` : '';
    return `${prefix}${days}${time}${PLAY_TIME_SUFFIX}`;
};

/**
 * 節目行 / 節目 sheet 嘅資料：播放時間、主持、簡介。airDays 本身唔算有資料，
 * 所以淨有星期幾就成段唔出；有其他資料先連播放時間一齊出（冇 airTime 就淨係星期幾）
 */
export const showInlineInfo = (show: ShowConfig): InlineInfo => ({
    ...field('airTime', hasItemInfo(show) ? formatPlayTime(show.airDays, show.airTime) : undefined),
    ...namesField('hosts', show.hosts),
    ...field('summary', show.summary || undefined),
});

/** 短篇行嘅資料：聲演、簡介 */
export const arcInlineInfo = (arc: ArcInfo | undefined): InlineInfo => ({
    ...namesField('cast', arc?.cast),
    ...field('summary', arc?.summary || undefined),
});

const SECTION_HEAD_KEYS: ReadonlySet<string> = new Set(['kind', 'title']);

/** 除咗類型同標題仲有其他欄位先算一段 */
const sectionsOf = (...sections: ItemInfoSection[]): ItemInfoSection[] =>
    sections.filter((section) => Object.keys(section).some((key) => !SECTION_HEAD_KEYS.has(key)));

/** 節目頁獨立 sheet：冇資料就空 */
export const showInfoSections = (show: ShowConfig): ItemInfoSection[] =>
    sectionsOf({ kind: 'show', title: show.name, ...showInlineInfo(show) });

/** 劇集嗰段：劇集名 + 簡介 */
const dramaSection = (drama: Drama): ItemInfoSection => ({
    kind: 'drama',
    title: drama.name,
    ...field('summary', drama.summary || undefined),
});

/** 每日劇頁獨立 sheet */
export const dailyInfoSections = (drama: Drama): ItemInfoSection[] =>
    sectionsOf(dramaSection(drama));

/** 短篇劇已揀短篇：上半劇集（有簡介先出），下半短篇（標題 = 短篇顯示名） */
export const arcInfoSections = (
    drama: Drama,
    arcLabel: string,
    arc: ArcInfo | undefined,
): ItemInfoSection[] =>
    sectionsOf(dramaSection(drama), { kind: 'arc', title: arcLabel, ...arcInlineInfo(arc) });

/** 成套短篇劇（劇集 + 全部短篇）有冇資料：冇就唔出全集箭咀、唱片圈 ⓘ */
export const seriesHasInfo = (drama: Drama, arcs: readonly (ArcInfo | undefined)[]): boolean =>
    hasItemInfo(drama) || arcs.some((arc) => arc !== undefined && hasItemInfo(arc));

/** 節目 / 劇集任何一集都冇進度（episode ID 頭兩段 = 類別 + id） */
export const hasNoItemProgress = (
    kind: keyof typeof EPISODE_ID_KIND,
    id: string,
    progressMap: ProgressMap,
): boolean => {
    const prefix = `${EPISODE_ID_KIND[kind]}:${id}:`;
    return Object.keys(progressMap).every((key) => !key.startsWith(prefix));
};

export interface AutoOpenInput {
    hasInfo: boolean;
    hasProgress: boolean;
    /** 入頁時 player 載入緊呢個節目 / 劇集 */
    loaded: boolean;
    /** 由「我的收藏」撳行入嚟 */
    focused: boolean;
}

/** 第一次入（冇進度、冇載入、唔係由收藏入）而且有資料先自動彈獨立 sheet */
export const shouldAutoOpenInfo = ({ hasInfo, hasProgress, loaded, focused }: AutoOpenInput) =>
    hasInfo && !hasProgress && !loaded && !focused;

/** 揀一個冇任何進度（new）嘅短篇，而且嗰個短篇有資料：自動彈嗰個短篇嘅獨立 sheet */
export const shouldAutoOpenArcInfo = (state: ArcState | undefined, info: InlineInfo): boolean =>
    state === 'new' && hasInlineInfo(info);

/*
 * drama.json 嘅型別同驗證。JSON import 會將所有 literal 闊化成 string，
 * 所以呢度逐個欄位驗，驗完先係 DramaDefinition（kind 等 literal 由此還原）。
 * 錯誤 message 一定寫明邊個檔、邊個欄位，方便加劇嘅人即刻改。
 */
import {
    checkId,
    fail,
    readBoolean,
    readEnum,
    readImage,
    readNonEmptyArray,
    readOptionalDate,
    readOptionalEnum,
    readOptionalImage,
    readOptionalInteger,
    readOptionalString,
    readRecord,
    readString,
    type ParseContext,
    type Raw,
} from '../core/reader';
import { readTheme, type ThemeDefinition } from '../core/themeSchema';
import type { DramaKind } from '../types/drama';
import {
    checkNotAfter,
    readEpisodeDates,
    readEpisodeRemovals,
    readWindow,
    type DateWindow,
    type EpisodeRange,
} from './availabilitySchema';

export type { EpisodeRange } from './availabilitySchema';

export { SchemaError as DramaSchemaError } from '../core/reader';
export type { ParseContext } from '../core/reader';

/** 劇集色調：ShowTheme 減碟面圖（圖由 folder 入面嘅 webp 補上） */
export type DramaThemeDefinition = ThemeDefinition;

export interface AudioDefinition {
    /** r2：DRAMA_AUDIO_BASE；app：app 自己 host（用家注入嘅 appAudioBase，player 係 BASE_URL/dramas/） */
    host: 'r2' | 'app';
    /** host 上面嘅劇集 folder */
    folder: string;
    /** 檔名 template（見 filename.ts renderFileName） */
    file: string;
}

export interface ArcDefinition {
    /**
     * 穩定 ASCII slug（drama.json 必填，同一劇唔可以重複）：episode ID（進度 / 收藏 key）用，
     * 所以 name（= R2 folder 名）改都唔會冇咗進度；有圖嘅短篇沿用圖片 folder 名（arcs/<slug>/）
     */
    id: string;
    name: string;
    /** 短篇自己嘅碟面圖（folder 內檔名）；冇就用劇集碟面 */
    disc?: string;
    /** 短篇自己嘅長方形圖（folder 內檔名，原 cover 比例）：暫時未用，留底防將來要 */
    tile?: string;
    /** 上架日（HK 當日 00:00 起）：將來日子 = 即將上架；冇就跟劇集 */
    addedAt?: string | undefined;
    /** 下架日（HK 當日 00:00 起唔再提供）；冇就跟劇集 */
    removedAt?: string | undefined;
    firstNo: number;
    /** 集數；未上架嘅短篇可以未知（drama.json 唔寫 episodes） */
    count?: number | undefined;
    /** 逐集上架：集數 → 「呢集起」上架日（第一批用 addedAt） */
    episodeDates: ReadonlyMap<number, string>;
    /** 集數下架：每段集數嘅下架日（唔重疊） */
    episodeRemovedAt: readonly EpisodeRange[];
    /** 集數 → 集名（照檔名寫法） */
    titles: ReadonlyMap<number, string>;
    /** 集數 → 完整檔名（不規則檔名用） */
    files: ReadonlyMap<number, string>;
}

export interface DailyEpisodeDefinition {
    date: string;
    rerun: boolean;
    file?: string;
}

interface DramaDefinitionBase {
    name: string;
    enabled: boolean;
    /** 主頁次序；冇寫就排喺有寫嘅後面，按 id 排 */
    order?: number;
    arcUnit?: 'season';
    tile: string;
    disc: string;
    audio: AudioDefinition;
    theme: DramaThemeDefinition;
    /** 全劇上架日：將來日子 = 整套即將上架（主頁書架最尾灰格）；短篇劇亦係短篇預設上架日 */
    addedAt?: string | undefined;
    /** 全劇下架日：當日起成套劇唔再提供 */
    removedAt?: string | undefined;
}

export interface SeriesDefinition extends DramaDefinitionBase {
    kind: 'series';
    arcs: readonly ArcDefinition[];
}

export interface DailyDefinition extends DramaDefinitionBase {
    kind: 'daily';
    episodes: readonly DailyEpisodeDefinition[];
}

export type DramaDefinition = SeriesDefinition | DailyDefinition;

const TOKEN_PATTERN = /\{(\w+)\}/g;
/** arc id：細楷英文 / 數字，用單個 - 分隔（schemas/drama.schema.json 同一條） */
export const ARC_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const DRAMA_KINDS = ['series', 'daily'] as const satisfies readonly DramaKind[];
const ARC_UNITS = ['season'] as const;
const AUDIO_HOSTS = ['r2', 'app'] as const;

/** 每種劇集 template 可以用嘅 token */
export const SERIES_TOKENS: ReadonlySet<string> = new Set([
    'no',
    'no2',
    'noZh',
    'arc',
    'folder',
    'title',
]);
export const DAILY_TOKENS: ReadonlySet<string> = new Set(['date', 'yyyymmdd', 'folder']);

const checkTemplate = (ctx: ParseContext, template: string, allowed: ReadonlySet<string>): void => {
    for (const [, token] of template.matchAll(TOKEN_PATTERN)) {
        if (token !== undefined && !allowed.has(token))
            fail(ctx, `audio.file: unknown token {${token}}`);
    }
};

const readAudio = (ctx: ParseContext, raw: Raw, kind: DramaKind): AudioDefinition => {
    const audio = readRecord(ctx, raw.audio, 'audio');
    const host = readEnum(ctx, audio, 'host', 'audio.host', AUDIO_HOSTS);
    const folder = readString(ctx, audio, 'folder', 'audio.folder');
    const file = readString(ctx, audio, 'file', 'audio.file');
    checkTemplate(ctx, file, kind === 'series' ? SERIES_TOKENS : DAILY_TOKENS);
    return { host, folder, file };
};

/** 集數 → 字串嘅 map（titles / files），key 要係範圍內嘅集數 */
const readNumberMap = (
    ctx: ParseContext,
    raw: Raw,
    key: string,
    path: string,
    range: { first: number; last: number },
): Map<number, string> => {
    const map = new Map<number, string>();
    if (raw[key] === undefined) return map;
    const entries = readRecord(ctx, raw[key], path);
    Object.entries(entries).forEach(([no, value]) => {
        const n = Number(no);
        if (!Number.isInteger(n)) fail(ctx, `${path}["${no}"] must be an episode number`);
        if (n < range.first || n > range.last)
            fail(ctx, `${path}["${no}"] is outside ${range.first}–${range.last}`);
        if (typeof value !== 'string' || value === '')
            fail(ctx, `${path}["${no}"] must be a non-empty string`);
        map.set(n, value);
    });
    return map;
};

const EPISODES_MESSAGE = 'must be a positive integer or a list of titles';
/** 逐集嘅欄位：要知道集數先寫得 */
const EPISODE_KEYS = ['titles', 'files', 'episodeDates', 'episodeRemovedAt'] as const;

/**
 * episodes 係集數（正整數）或者集名 list；回傳集數同 list 入面有嘅集名。
 * 未上架嘅短篇（有 addedAt）可以唔寫，集數就係 undefined
 */
const readEpisodeCount = (
    ctx: ParseContext,
    raw: Raw,
    path: string,
    arc: { firstNo: number; addedAt: string | undefined },
): { count: number | undefined; titles: Map<number, string> } => {
    const value = raw.episodes;
    const titles = new Map<number, string>();
    if (value === undefined && arc.addedAt) return { count: undefined, titles };
    if (value === undefined)
        fail(ctx, `${path} ${EPISODES_MESSAGE} (or leave it out with an addedAt)`);
    if (Number.isInteger(value) && (value as number) > 0) return { count: value as number, titles };
    if (!Array.isArray(value) || value.length === 0) fail(ctx, `${path} ${EPISODES_MESSAGE}`);
    (value as unknown[]).forEach((title, i) => {
        if (title !== null && typeof title !== 'string')
            fail(ctx, `${path}[${i}] must be a string or null`);
        if (typeof title === 'string') titles.set(arc.firstNo + i, title);
    });
    return { count: (value as unknown[]).length, titles };
};

const readFirstNo = (ctx: ParseContext, raw: Raw, path: string): number => {
    const value = raw.firstNo;
    if (value === undefined) return 1;
    return Number.isInteger(value) && (value as number) >= 0
        ? (value as number)
        : fail(ctx, `${path} must be a non-negative integer`);
};

/** 短篇嘅集數同集名 / 檔名 map（未知集數就全部空） */
const readArcEpisodes = (
    ctx: ParseContext,
    raw: Raw,
    path: string,
    arc: { firstNo: number; addedAt: string | undefined },
) => {
    const { count, titles } = readEpisodeCount(ctx, raw, `${path}.episodes`, arc);
    const range = { first: arc.firstNo, last: arc.firstNo + (count ?? 0) - 1 };
    // 未知集數：逐集嘅欄位冇範圍可以對，一律要等寫咗 episodes 先寫
    const perEpisode = EPISODE_KEYS.find((key) => raw[key] !== undefined);
    if (count === undefined && perEpisode) fail(ctx, `${path}.${perEpisode} needs episodes`);
    readNumberMap(ctx, raw, 'titles', `${path}.titles`, range).forEach((t, no) =>
        titles.set(no, t),
    );
    return {
        count,
        titles,
        range,
        files: readNumberMap(ctx, raw, 'files', `${path}.files`, range),
    };
};

/** 短篇嘅上架 / 下架：arc 冇寫就跟劇集；arc 下架唔可以遲過劇集 */
const readArcWindow = (ctx: ParseContext, raw: Raw, path: string, drama: DateWindow) => {
    const own = readWindow(ctx, raw, `${path}.`, drama.addedAt);
    checkNotAfter(ctx, `${path}.removedAt`, own.removedAt, {
        label: 'drama',
        date: drama.removedAt,
    });
    return {
        own,
        addedAt: own.addedAt ?? drama.addedAt,
        removedAt: own.removedAt ?? drama.removedAt,
    };
};

/** 同一劇已經見過嘅 arc name / id（兩樣都唔可以重複） */
interface SeenArcs {
    names: Set<string>;
    ids: Set<string>;
}

/** arc 嘅 name（顯示 + R2 folder）同 id（episode ID 用嘅 slug） */
const readArcIdentity = (ctx: ParseContext, raw: Raw, path: string, seen: SeenArcs) => {
    const name = readString(ctx, raw, 'name', `${path}.name`);
    if (seen.names.has(name)) fail(ctx, `${path}.name: duplicate arc ${name}`);
    seen.names.add(name);
    const id = readString(ctx, raw, 'id', `${path}.id`);
    if (!ARC_ID_PATTERN.test(id))
        fail(ctx, `${path}.id must be a lowercase ASCII slug like season-1 (got ${id})`);
    if (seen.ids.has(id)) fail(ctx, `${path}.id: duplicate arc id ${id}`);
    seen.ids.add(id);
    return { id, name };
};

const readArc = (
    ctx: ParseContext,
    value: unknown,
    path: string,
    { seen, drama }: { seen: SeenArcs; drama: DateWindow },
): ArcDefinition => {
    const raw = readRecord(ctx, value, path);
    const identity = readArcIdentity(ctx, raw, path, seen);
    const firstNo = readFirstNo(ctx, raw, `${path}.firstNo`);
    const window = readArcWindow(ctx, raw, path, drama);
    const { range, ...episodes } = readArcEpisodes(ctx, raw, path, { firstNo, ...window });
    const datesCtx = { path: `${path}.episodeDates`, range, addedAt: window.addedAt };
    const episodeDates = readEpisodeDates(ctx, raw, datesCtx);
    const removalCtx = { ...datesCtx, path: `${path}.episodeRemovedAt`, episodeDates };
    return {
        ...identity,
        disc: readOptionalImage(ctx, raw, 'disc', `${path}.disc`),
        tile: readOptionalImage(ctx, raw, 'tile', `${path}.tile`),
        ...window.own,
        firstNo,
        ...episodes,
        episodeDates,
        episodeRemovedAt: readEpisodeRemovals(ctx, raw, {
            ...removalCtx,
            removedAt: window.removedAt,
        }),
    };
};

const readArcs = (ctx: ParseContext, raw: Raw, drama: DateWindow): readonly ArcDefinition[] => {
    const seen: SeenArcs = { names: new Set(), ids: new Set() };
    return readNonEmptyArray(ctx, raw, 'arcs').map((arc, i) =>
        readArc(ctx, arc, `arcs[${i}]`, { seen, drama }),
    );
};

const readDailyEpisode = (
    ctx: ParseContext,
    value: unknown,
    path: string,
    seen: Set<string>,
): DailyEpisodeDefinition => {
    const raw = readRecord(ctx, value, path);
    const date = readOptionalDate(ctx, raw, 'date', `${path}.date`);
    if (date === undefined) fail(ctx, `${path}.date must be a YYYY-MM-DD date`);
    if (seen.has(date)) fail(ctx, `${path}.date: duplicate date ${date}`);
    seen.add(date);
    const file = readOptionalString(ctx, raw, 'file', `${path}.file`);
    return {
        date,
        rerun: readBoolean(ctx, raw, 'rerun', `${path}.rerun`, false),
        ...(file ? { file } : {}),
    };
};

const readDailyEpisodes = (ctx: ParseContext, raw: Raw): readonly DailyEpisodeDefinition[] => {
    const seen = new Set<string>();
    return readNonEmptyArray(ctx, raw, 'episodes').map((e, i) =>
        readDailyEpisode(ctx, e, `episodes[${i}]`, seen),
    );
};

const readBase = (ctx: ParseContext, raw: Raw, kind: DramaKind): DramaDefinitionBase => ({
    name: readString(ctx, raw, 'name'),
    enabled: readBoolean(ctx, raw, 'enabled', 'enabled'),
    order: readOptionalInteger(ctx, raw, 'order', 'order'),
    arcUnit: readOptionalEnum(ctx, raw, 'arcUnit', 'arcUnit', ARC_UNITS),
    tile: readImage(ctx, raw, 'tile', 'tile'),
    disc: readImage(ctx, raw, 'disc', 'disc'),
    audio: readAudio(ctx, raw, kind),
    theme: readTheme(ctx, raw),
    ...readWindow(ctx, raw, ''),
});

/** 驗證一個 drama.json（JSON import 返嚟嘅 unknown），唔合格就 throw DramaSchemaError */
export const parseDramaDefinition = (value: unknown, ctx: ParseContext): DramaDefinition => {
    checkId(ctx);
    const raw = readRecord(ctx, value, 'drama.json');
    const kind = readEnum(ctx, raw, 'kind', 'kind', DRAMA_KINDS);
    const base = readBase(ctx, raw, kind);
    if (kind === 'daily') return { ...base, kind, episodes: readDailyEpisodes(ctx, raw) };
    return { ...base, kind, arcs: readArcs(ctx, raw, base) };
};

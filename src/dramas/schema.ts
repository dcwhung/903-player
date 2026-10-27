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
} from '../catalog/reader';
import { readTheme, type ThemeDefinition } from '../catalog/themeSchema';
import type { DramaKind } from '../types/drama';

export { SchemaError as DramaSchemaError } from '../catalog/reader';
export type { ParseContext } from '../catalog/reader';

/** 劇集色調：ShowTheme 減碟面圖（圖由 folder 入面嘅 webp 補上） */
export type DramaThemeDefinition = ThemeDefinition;

export interface AudioDefinition {
    /** r2：DRAMA_AUDIO_BASE；app：app 自己 host（BASE_URL/dramas/） */
    host: 'r2' | 'app';
    /** host 上面嘅劇集 folder */
    folder: string;
    /** 檔名 template（見 filename.ts renderFileName） */
    file: string;
}

export interface ArcDefinition {
    name: string;
    /** 短篇自己嘅碟面圖（folder 內檔名）；冇就用劇集碟面 */
    disc?: string;
    /** 短篇自己嘅長方形圖（folder 內檔名，原 cover 比例）：暫時未用，留底防將來要 */
    tile?: string;
    addedAt?: string;
    firstNo: number;
    count: number;
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
}

export interface SeriesDefinition extends DramaDefinitionBase {
    kind: 'series';
    /** 全劇預設上架日（arc 自己有就用 arc 嘅） */
    addedAt?: string;
    arcs: readonly ArcDefinition[];
}

export interface DailyDefinition extends DramaDefinitionBase {
    kind: 'daily';
    episodes: readonly DailyEpisodeDefinition[];
}

export type DramaDefinition = SeriesDefinition | DailyDefinition;

const TOKEN_PATTERN = /\{(\w+)\}/g;

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

/** episodes 係集數（正整數）或者集名 list；回傳集數同 list 入面有嘅集名 */
const readEpisodeCount = (
    ctx: ParseContext,
    raw: Raw,
    path: string,
    firstNo: number,
): { count: number; titles: Map<number, string> } => {
    const value = raw.episodes;
    const titles = new Map<number, string>();
    if (Number.isInteger(value) && (value as number) > 0) return { count: value as number, titles };
    if (!Array.isArray(value) || value.length === 0)
        fail(ctx, `${path} must be a positive integer or a list of titles`);
    (value as unknown[]).forEach((title, i) => {
        if (title !== null && typeof title !== 'string')
            fail(ctx, `${path}[${i}] must be a string or null`);
        if (typeof title === 'string') titles.set(firstNo + i, title);
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

const readArc = (
    ctx: ParseContext,
    value: unknown,
    path: string,
    seen: Set<string>,
): ArcDefinition => {
    const raw = readRecord(ctx, value, path);
    const name = readString(ctx, raw, 'name', `${path}.name`);
    if (seen.has(name)) fail(ctx, `${path}.name: duplicate arc ${name}`);
    seen.add(name);
    const firstNo = readFirstNo(ctx, raw, `${path}.firstNo`);
    const { count, titles } = readEpisodeCount(ctx, raw, `${path}.episodes`, firstNo);
    const range = { first: firstNo, last: firstNo + count - 1 };
    readNumberMap(ctx, raw, 'titles', `${path}.titles`, range).forEach((t, no) =>
        titles.set(no, t),
    );
    return {
        name,
        disc: readOptionalImage(ctx, raw, 'disc', `${path}.disc`),
        tile: readOptionalImage(ctx, raw, 'tile', `${path}.tile`),
        addedAt: readOptionalDate(ctx, raw, 'addedAt', `${path}.addedAt`),
        firstNo,
        count,
        titles,
        files: readNumberMap(ctx, raw, 'files', `${path}.files`, range),
    };
};

const readArcs = (ctx: ParseContext, raw: Raw): readonly ArcDefinition[] => {
    const seen = new Set<string>();
    return readNonEmptyArray(ctx, raw, 'arcs').map((arc, i) =>
        readArc(ctx, arc, `arcs[${i}]`, seen),
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
});

/** 驗證一個 drama.json（JSON import 返嚟嘅 unknown），唔合格就 throw DramaSchemaError */
export const parseDramaDefinition = (value: unknown, ctx: ParseContext): DramaDefinition => {
    checkId(ctx);
    const raw = readRecord(ctx, value, 'drama.json');
    const kind = readEnum(ctx, raw, 'kind', 'kind', DRAMA_KINDS);
    const base = readBase(ctx, raw, kind);
    if (kind === 'daily') return { ...base, kind, episodes: readDailyEpisodes(ctx, raw) };
    return {
        ...base,
        kind,
        addedAt: readOptionalDate(ctx, raw, 'addedAt', 'addedAt'),
        arcs: readArcs(ctx, raw),
    };
};

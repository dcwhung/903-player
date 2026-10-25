/*
 * drama.json 嘅型別同驗證。JSON import 會將所有 literal 闊化成 string，
 * 所以呢度逐個欄位驗，驗完先係 DramaDefinition（kind 等 literal 由此還原）。
 * 錯誤 message 一定寫明邊個檔、邊個欄位，方便加劇嘅人即刻改。
 */
import type { ShowTheme } from '../config/showThemes';
import type { DramaKind } from '../types/drama';
import { isCalendarDate } from '../utils/date';

export class DramaSchemaError extends Error {
    override readonly name = 'DramaSchemaError';
}

/** 劇集色調：ShowTheme 減碟面圖（圖由 folder 入面嘅 webp 補上） */
export type DramaThemeDefinition = Omit<ShowTheme, 'art'>;

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

export interface ParseContext {
    /** folder 名，亦係 /drama/:id */
    id: string;
    /** 錯誤 message 用嘅檔案路徑 */
    source: string;
    /** folder 入面有嘅圖檔名 */
    files: ReadonlySet<string>;
}

export const DRAMA_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const HEX_COLOUR_PATTERN = /^#[0-9a-f]{6}$/i;
const TOKEN_PATTERN = /\{(\w+)\}/g;

const DRAMA_KINDS = ['series', 'daily'] as const satisfies readonly DramaKind[];
const ARC_UNITS = ['season'] as const;
const SCHEMES = ['light'] as const;
const AUDIO_HOSTS = ['r2', 'app'] as const;
const THEME_COLOUR_KEYS = [
    'bg',
    'surface',
    'track',
    'accent',
    'onAccent',
    'title',
    'text',
    'muted',
    'shadowDark',
    'shadowLight',
] as const;
const THEME_OPTIONAL_COLOUR_KEYS = ['statusBar', 'accentText'] as const;
const THEME_OPTIONAL_TEXT_KEYS = ['titleFont', 'headerRule'] as const;

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

type Raw = Record<string, unknown>;

/** 明確寫 type annotation，TypeScript 先會當佢係 assertion function 去收窄（例如 if (x === undefined) fail(...)） */
const fail: (ctx: ParseContext, message: string) => never = (ctx, message) => {
    throw new DramaSchemaError(`${ctx.source}: ${message}`);
};

const isRecord = (value: unknown): value is Raw =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const readRecord = (ctx: ParseContext, value: unknown, path: string): Raw =>
    isRecord(value) ? value : fail(ctx, `${path} must be an object`);

const readString = (ctx: ParseContext, raw: Raw, key: string, path: string = key): string => {
    const value = raw[key];
    return typeof value === 'string' && value !== ''
        ? value
        : fail(ctx, `${path} must be a non-empty string`);
};

const readOptionalString = (
    ctx: ParseContext,
    raw: Raw,
    key: string,
    path: string,
): string | undefined => (raw[key] === undefined ? undefined : readString(ctx, raw, key, path));

const readBoolean = (
    ctx: ParseContext,
    raw: Raw,
    key: string,
    path: string,
    fallback?: boolean,
): boolean => {
    const value = raw[key];
    if (value === undefined && fallback !== undefined) return fallback;
    return typeof value === 'boolean' ? value : fail(ctx, `${path} must be a boolean`);
};

const readOptionalInteger = (
    ctx: ParseContext,
    raw: Raw,
    key: string,
    path: string,
): number | undefined =>
    raw[key] === undefined
        ? undefined
        : Number.isInteger(raw[key])
          ? (raw[key] as number)
          : fail(ctx, `${path} must be an integer`);

const readEnum = <T extends string>(
    ctx: ParseContext,
    raw: Raw,
    key: string,
    path: string,
    allowed: readonly T[],
): T => {
    const value = raw[key];
    return allowed.includes(value as T)
        ? (value as T)
        : fail(ctx, `${path} must be one of ${allowed.join(', ')}`);
};

const readOptionalEnum = <T extends string>(
    ctx: ParseContext,
    raw: Raw,
    key: string,
    path: string,
    allowed: readonly T[],
): T | undefined => (raw[key] === undefined ? undefined : readEnum(ctx, raw, key, path, allowed));

const readHex = (ctx: ParseContext, raw: Raw, key: string, path: string): string => {
    const value = raw[key];
    return typeof value === 'string' && HEX_COLOUR_PATTERN.test(value)
        ? value
        : fail(ctx, `${path} must be a #rrggbb colour`);
};

const readOptionalDate = (
    ctx: ParseContext,
    raw: Raw,
    key: string,
    path: string,
): string | undefined => {
    const value = raw[key];
    if (value === undefined) return undefined;
    return typeof value === 'string' && isCalendarDate(value)
        ? value
        : fail(ctx, `${path} must be a YYYY-MM-DD date`);
};

const readImage = (ctx: ParseContext, raw: Raw, key: string, path: string): string => {
    const file = readString(ctx, raw, key, path);
    return ctx.files.has(file) ? file : fail(ctx, `${path}: no file ${file} in the folder`);
};

const readOptionalImage = (
    ctx: ParseContext,
    raw: Raw,
    key: string,
    path: string,
): string | undefined => (raw[key] === undefined ? undefined : readImage(ctx, raw, key, path));

const readTheme = (ctx: ParseContext, raw: Raw): DramaThemeDefinition => {
    const theme = readRecord(ctx, raw.theme, 'theme');
    const colours = Object.fromEntries(
        THEME_COLOUR_KEYS.map((key) => [key, readHex(ctx, theme, key, `theme.${key}`)]),
    ) as Record<(typeof THEME_COLOUR_KEYS)[number], string>;
    const optional: Partial<DramaThemeDefinition> = {};
    THEME_OPTIONAL_COLOUR_KEYS.forEach((key) => {
        if (theme[key] !== undefined) optional[key] = readHex(ctx, theme, key, `theme.${key}`);
    });
    THEME_OPTIONAL_TEXT_KEYS.forEach((key) => {
        const value = readOptionalString(ctx, theme, key, `theme.${key}`);
        if (value !== undefined) optional[key] = value;
    });
    const scheme = readOptionalEnum(ctx, theme, 'scheme', 'theme.scheme', SCHEMES);
    return { ...colours, ...optional, ...(scheme ? { scheme } : {}) };
};

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
        addedAt: readOptionalDate(ctx, raw, 'addedAt', `${path}.addedAt`),
        firstNo,
        count,
        titles,
        files: readNumberMap(ctx, raw, 'files', `${path}.files`, range),
    };
};

const readArcs = (ctx: ParseContext, raw: Raw): readonly ArcDefinition[] => {
    const arcs = raw.arcs;
    if (!Array.isArray(arcs) || arcs.length === 0) fail(ctx, 'arcs must not be empty');
    const seen = new Set<string>();
    return (arcs as unknown[]).map((arc, i) => readArc(ctx, arc, `arcs[${i}]`, seen));
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
    const episodes = raw.episodes;
    if (!Array.isArray(episodes) || episodes.length === 0) fail(ctx, 'episodes must not be empty');
    const seen = new Set<string>();
    return (episodes as unknown[]).map((e, i) => readDailyEpisode(ctx, e, `episodes[${i}]`, seen));
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
    if (!DRAMA_ID_PATTERN.test(ctx.id))
        fail(ctx, `folder name must match ${DRAMA_ID_PATTERN.toString()}`);
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

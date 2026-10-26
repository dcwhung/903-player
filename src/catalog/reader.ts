/*
 * JSON 資料檔（drama.json / show.json）嘅共用 reader。
 * JSON import 會將所有 literal 闊化成 string，所以逐個欄位驗，驗完先有準確型別。
 * 每個錯誤都寫明邊個檔（ctx.source）、邊個欄位（path），方便加資料嘅人即刻改。
 */
import { isCalendarDate } from '../utils/date';

export class SchemaError extends Error {
    override readonly name = 'SchemaError';
}

export interface ParseContext {
    /** folder 名，亦係 route id */
    id: string;
    /** 錯誤 message 用嘅檔案路徑（例如 src/dramas/golden/drama.json） */
    source: string;
    /** folder 入面有嘅圖檔名 */
    files: ReadonlySet<string>;
}

export type Raw = Record<string, unknown>;

/** folder 名 = route id：細楷英數同連字號 */
export const ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const HEX_COLOUR_PATTERN = /^#[0-9a-f]{6}$/i;

/** 明確寫 type annotation，TypeScript 先會當佢係 assertion function 去收窄（例如 if (x === undefined) fail(...)） */
export const fail: (ctx: ParseContext, message: string) => never = (ctx, message) => {
    throw new SchemaError(`${ctx.source}: ${message}`);
};

export const checkId = (ctx: ParseContext): void => {
    if (!ID_PATTERN.test(ctx.id)) fail(ctx, `folder name must match ${ID_PATTERN.toString()}`);
};

const isRecord = (value: unknown): value is Raw =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

export const readRecord = (ctx: ParseContext, value: unknown, path: string): Raw =>
    isRecord(value) ? value : fail(ctx, `${path} must be an object`);

export const readString = (
    ctx: ParseContext,
    raw: Raw,
    key: string,
    path: string = key,
): string => {
    const value = raw[key];
    return typeof value === 'string' && value !== ''
        ? value
        : fail(ctx, `${path} must be a non-empty string`);
};

export const readOptionalString = (
    ctx: ParseContext,
    raw: Raw,
    key: string,
    path: string = key,
): string | undefined => (raw[key] === undefined ? undefined : readString(ctx, raw, key, path));

export const readBoolean = (
    ctx: ParseContext,
    raw: Raw,
    key: string,
    path: string = key,
    fallback?: boolean,
): boolean => {
    const value = raw[key];
    if (value === undefined && fallback !== undefined) return fallback;
    return typeof value === 'boolean' ? value : fail(ctx, `${path} must be a boolean`);
};

export const readOptionalInteger = (
    ctx: ParseContext,
    raw: Raw,
    key: string,
    path: string = key,
): number | undefined =>
    raw[key] === undefined
        ? undefined
        : Number.isInteger(raw[key])
          ? (raw[key] as number)
          : fail(ctx, `${path} must be an integer`);

export const readEnum = <T extends string>(
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

export const readOptionalEnum = <T extends string>(
    ctx: ParseContext,
    raw: Raw,
    key: string,
    path: string,
    allowed: readonly T[],
): T | undefined => (raw[key] === undefined ? undefined : readEnum(ctx, raw, key, path, allowed));

export const readHex = (ctx: ParseContext, raw: Raw, key: string, path: string = key): string => {
    const value = raw[key];
    return typeof value === 'string' && HEX_COLOUR_PATTERN.test(value)
        ? value
        : fail(ctx, `${path} must be a #rrggbb colour`);
};

export const readOptionalDate = (
    ctx: ParseContext,
    raw: Raw,
    key: string,
    path: string = key,
): string | undefined => {
    const value = raw[key];
    if (value === undefined) return undefined;
    return typeof value === 'string' && isCalendarDate(value)
        ? value
        : fail(ctx, `${path} must be a YYYY-MM-DD date`);
};

/** 圖檔名：要真係存在於 folder（ctx.files） */
export const readImage = (ctx: ParseContext, raw: Raw, key: string, path: string = key): string => {
    const file = readString(ctx, raw, key, path);
    return ctx.files.has(file) ? file : fail(ctx, `${path}: no file ${file} in the folder`);
};

export const readOptionalImage = (
    ctx: ParseContext,
    raw: Raw,
    key: string,
    path: string = key,
): string | undefined => (raw[key] === undefined ? undefined : readImage(ctx, raw, key, path));

/** 非空 array，否則 throw；回傳 unknown[] 畀 caller 逐個驗 */
export const readNonEmptyArray = (
    ctx: ParseContext,
    raw: Raw,
    key: string,
    path: string = key,
): unknown[] => {
    const value = raw[key];
    if (!Array.isArray(value) || value.length === 0) fail(ctx, `${path} must not be empty`);
    return value as unknown[];
};

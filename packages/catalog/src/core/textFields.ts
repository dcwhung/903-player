/*
 * Phase 3 加嘅 optional 文字欄位（簡介、主持 / 聲演名單、顯示名稱、上架開關）：show / drama / arc 共用。
 * 長度以字（code point）計，同 JSON Schema 嘅 maxLength 一致
 */
import { fail, readBoolean, readString, type ParseContext, type Raw } from './reader';

/** 簡介最多幾多字 */
export const SUMMARY_MAX_LENGTH = 500;
/** 主持 / 聲演每個名、短篇顯示名稱最多幾多字 */
export const NAME_MAX_LENGTH = 40;
/** 主持 / 聲演最多幾多個 */
export const NAME_LIST_MAX_ITEMS = 12;

const lengthOf = (text: string): number => [...text].length;

const readBoundedString = (
    ctx: ParseContext,
    raw: Raw,
    key: string,
    { path, max }: { path: string; max: number },
): string | undefined => {
    if (raw[key] === undefined) return undefined;
    const value = readString(ctx, raw, key, path);
    return lengthOf(value) <= max ? value : fail(ctx, `${path} must be at most ${max} characters`);
};

/** 簡介：1–500 字 */
export const readOptionalSummary = (ctx: ParseContext, raw: Raw, path: string) =>
    readBoundedString(ctx, raw, 'summary', { path, max: SUMMARY_MAX_LENGTH });

/** 短篇顯示名稱：1–40 字 */
export const readOptionalDisplayName = (ctx: ParseContext, raw: Raw, path: string) =>
    readBoundedString(ctx, raw, 'displayName', { path, max: NAME_MAX_LENGTH });

export const readOptionalBoolean = (
    ctx: ParseContext,
    raw: Raw,
    key: string,
    path: string,
): boolean | undefined => (raw[key] === undefined ? undefined : readBoolean(ctx, raw, key, path));

const isName = (value: unknown): value is string =>
    typeof value === 'string' && value !== '' && lengthOf(value) <= NAME_MAX_LENGTH;

/** 主持 / 聲演：≤ 12 個名，每個 1–40 字，唔可以重複 */
export const readOptionalNames = (
    ctx: ParseContext,
    raw: Raw,
    key: string,
    path: string,
): readonly string[] | undefined => {
    const value = raw[key];
    if (value === undefined) return undefined;
    if (!Array.isArray(value)) fail(ctx, `${path} must be a list of names`);
    const names = value as unknown[];
    if (names.length > NAME_LIST_MAX_ITEMS)
        fail(ctx, `${path} must have at most ${NAME_LIST_MAX_ITEMS} names`);
    const seen = new Set<string>();
    return names.map((name, i) => {
        if (!isName(name)) fail(ctx, `${path}[${i}] must be 1–${NAME_MAX_LENGTH} characters`);
        if (seen.has(name)) fail(ctx, `${path}[${i}]: duplicate name ${name}`);
        seen.add(name);
        return name;
    });
};

/** 有值先放入 object（parse 結果唔會多咗 undefined key） */
export const present = <K extends string, V>(key: K, value: V | undefined) =>
    (value === undefined ? {} : { [key]: value }) as Partial<Record<K, V>>;

/*
 * show.json 嘅型別同驗證（一個 folder = 一個 903 節目）。
 * name 同 fileTime 用嚟砌錄音 URL（audioProbe.buildAudioUrl），URL 係已儲進度嘅 key，唔可以亂改。
 */
import {
    checkId,
    fail,
    readImage,
    readNonEmptyArray,
    readOptionalInteger,
    readRecord,
    readString,
    type ParseContext,
    type Raw,
} from '../catalog/reader';
import { readTheme, type ThemeDefinition } from '../catalog/themeSchema';
import type { Weekday } from '../types/weekday';

export { SchemaError as ShowSchemaError } from '../catalog/reader';

export interface ShowDefinition {
    /** 原站 `?show=` 參數，亦係顯示名稱 */
    name: string;
    /** 原站錄音檔名嘅 HHMM（每個節目固定） */
    fileTime: string;
    /** 逢星期幾播（0 = 星期日 … 6 = 星期六） */
    airDays: readonly Weekday[];
    /** 主頁次序；冇寫就排喺有寫嘅後面，按 id 排 */
    order?: number;
    /** 主頁節目格圖（folder 內檔名，16:9） */
    tile: string;
    /** 碟面圖（folder 內檔名，正方形）：唱片、mini player、今日節目 */
    disc: string;
    theme: ThemeDefinition;
}

const FILE_TIME_PATTERN = /^([01]\d|2[0-3])[0-5]\d$/;
const SUNDAY = 0;
const SATURDAY = 6;

const isWeekday = (value: unknown): value is Weekday =>
    Number.isInteger(value) && (value as number) >= SUNDAY && (value as number) <= SATURDAY;

const readFileTime = (ctx: ParseContext, raw: Raw): string => {
    const value = readString(ctx, raw, 'fileTime');
    return FILE_TIME_PATTERN.test(value) ? value : fail(ctx, 'fileTime must be HHMM');
};

const readAirDays = (ctx: ParseContext, raw: Raw): readonly Weekday[] => {
    const days = readNonEmptyArray(ctx, raw, 'airDays');
    const seen = new Set<number>();
    return days.map((day, i) => {
        if (!isWeekday(day)) fail(ctx, `airDays[${i}] must be a weekday 0–6`);
        if (seen.has(day)) fail(ctx, `airDays[${i}]: duplicate weekday ${day}`);
        seen.add(day);
        return day;
    });
};

/** 驗證一個 show.json（JSON import 返嚟嘅 unknown），唔合格就 throw ShowSchemaError */
export const parseShowDefinition = (value: unknown, ctx: ParseContext): ShowDefinition => {
    checkId(ctx);
    const raw = readRecord(ctx, value, 'show.json');
    return {
        name: readString(ctx, raw, 'name'),
        fileTime: readFileTime(ctx, raw),
        airDays: readAirDays(ctx, raw),
        order: readOptionalInteger(ctx, raw, 'order'),
        tile: readImage(ctx, raw, 'tile'),
        disc: readImage(ctx, raw, 'disc'),
        theme: readTheme(ctx, raw),
    };
};

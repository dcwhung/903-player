/*
 * ISO YYYY-MM-DD 嘅共用小工具（S-837）：補零、拆年月日。拆法用 catalog `splitIsoDate`（S-858，唔再自己寫一套）；
 * 星期幾一律用 catalog `weekdayOf`（同排程同一個）
 */
import { splitIsoDate } from '@903-player/catalog';

/** 1 → '01'（日、月、時、分） */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * YYYY-MM-DD → { year, month, day }。只收完整日子（admin 嘅 caller 全部係；空字串由 formatDmy 先擋），
 * 欄位唔齊會係 NaN（同 catalog 一樣），唔再補 0 / 1 / 1
 */
export const isoPartsOf = (iso: string) => {
    const [year, month, day] = splitIsoDate(iso);
    return { year, month, day };
};

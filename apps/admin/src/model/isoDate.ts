/*
 * ISO YYYY-MM-DD 嘅共用小工具（S-837）：補零、拆年月日。星期幾一律用 catalog `weekdayOf`（同排程同一個）
 */

/** 1 → '01'（日、月、時、分） */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** YYYY-MM-DD → { year, month, day }（欄位唔齊就用 0 / 1 / 1） */
export const isoPartsOf = (iso: string) => {
    const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
    return { year, month, day };
};

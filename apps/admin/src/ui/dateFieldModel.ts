/*
 * 自訂日期欄（DateField）嘅純邏輯（用戶 2026-11-12）：一律顯示 DD/MM/YYYY，入出都係 ISO YYYY-MM-DD；
 * 月曆由星期日開始（同星期掣「日 一 二 … 六」一樣）
 */
const DMY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const DAYS_PER_WEEK = 7;

const pad2 = (n: number) => String(n).padStart(2, '0');

const isoOf = (year: number, month: number, day: number) =>
    `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;

const partsOf = (iso: string) => {
    const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
    return { year, month, day };
};

const daysInMonth = (year: number, month: number) =>
    new Date(Date.UTC(year, month, 0)).getUTCDate();

/** YYYY-MM-DD → DD/MM/YYYY（空就空） */
export const formatDmy = (iso: string): string => {
    if (!iso) return '';
    const { year, month, day } = partsOf(iso);
    return `${pad2(day)}/${pad2(month)}/${year}`;
};

/** 打字 DD/MM/YYYY（日、月可以一位數）→ ISO；唔係真嘅日子就 null */
export const parseDmy = (text: string): string | null => {
    const match = DMY.exec(text.trim());
    if (!match) return null;
    const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
    return isoOf(year, month, day);
};

/** 加減月份：日子超出新月份就用嗰個月最後一日（31/1 + 1 月 = 28/2） */
export const addMonths = (iso: string, months: number): string => {
    const { year, month, day } = partsOf(iso);
    const index = year * 12 + (month - 1) + months;
    const y = Math.floor(index / 12);
    const m = (index % 12) + 1;
    return isoOf(y, m, Math.min(day, daysInMonth(y, m)));
};

/** 星期幾（0 = 日） */
export const weekdayOf = (iso: string): number => {
    const { year, month, day } = partsOf(iso);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

/** 嗰個月嘅月曆：每行一個星期（日 → 六），唔屬於嗰個月嘅格 = null */
export const monthWeeks = (iso: string): (string | null)[][] => {
    const { year, month } = partsOf(iso);
    const first = isoOf(year, month, 1);
    const cells: (string | null)[] = [
        ...Array.from({ length: weekdayOf(first) }, () => null),
        ...Array.from({ length: daysInMonth(year, month) }, (_, i) => isoOf(year, month, i + 1)),
    ];
    while (cells.length % DAYS_PER_WEEK !== 0) cells.push(null);
    return Array.from({ length: cells.length / DAYS_PER_WEEK }, (_, w) =>
        cells.slice(w * DAYS_PER_WEEK, (w + 1) * DAYS_PER_WEEK),
    );
};

/** 年、月（顯示月份標題用） */
export const yearMonthOf = (iso: string) => {
    const { year, month } = partsOf(iso);
    return { year, month };
};

export const dayOf = (iso: string) => partsOf(iso).day;

/** 超出 min / max：'min' / 'max'；冇問題 = null */
export const rangeProblem = (
    iso: string,
    min: string | undefined,
    max: string | undefined,
): 'min' | 'max' | null => {
    if (min && iso < min) return 'min';
    if (max && iso > max) return 'max';
    return null;
};

/** 兩個（可有可無嘅）ISO 日子揀遲嗰個：排程日期欄 min = max(今日, 原有 min) */
export const latestOf = (date: string, other: string | undefined): string =>
    other !== undefined && other > date ? other : date;

/** popover 同欄位之間嘅空位（同 CSS .date-pop top / bottom 嘅 6px 一樣） */
const POP_GAP = 6;

interface Span {
    top: number;
    bottom: number;
}

/**
 * 月曆向下定向上開：下面唔夠位（viewport 同捲動容器取細）而上面又多過下面先向上
 * （用戶 2026-11-12）
 */
export const placementOf = (field: Span, popHeight: number, view: Span): 'down' | 'up' => {
    const below = view.bottom - field.bottom;
    const above = field.top - view.top;
    return below < popHeight + POP_GAP && above > below ? 'up' : 'down';
};

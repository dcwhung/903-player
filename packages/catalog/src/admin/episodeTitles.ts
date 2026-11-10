/*
 * 各集標題 textarea（admin 短篇編輯）：每行「第 X 集 ｜ 標題」，冇標題可以留空。
 * formatTitles：arc JSON → 文字；parseTitles：文字 → titles（集數 → 標題）+ 逐行錯誤（格式、超出範圍、重複）
 */

/** arc JSON（drama.json 嘅一個短篇，未驗證）入面用到嘅欄位 */
export interface TitledArc {
    firstNo?: number;
    episodes?: number | readonly (string | null)[];
    titles?: Readonly<Record<string, string>>;
}

export type TitleErrorKind = 'format' | 'range' | 'duplicate';

export interface TitleError {
    /** 第幾行（由 1 開始，計埋空行） */
    line: number;
    kind: TitleErrorKind;
    message: string;
}

export interface ParsedTitles {
    /** 集數 → 標題（冇標題嘅集數唔出） */
    titles: Record<string, string>;
    errors: TitleError[];
}

const DEFAULT_FIRST_NO = 1;
const LINE_BREAK = '\n';
/** 全形「｜」（textarea 顯示用），半形「|」都收 */
const TITLE_SEPARATOR = '｜';
const LINE_PATTERN = /^第\s*(\d+)\s*集\s*(?:[｜|]\s*(.*))?$/;

const countOf = (arc: TitledArc): number => {
    const { episodes } = arc;
    if (typeof episodes === 'number') return episodes;
    return Array.isArray(episodes) ? episodes.length : 0;
};

/** episodes list 嘅集名 + titles（titles 優先），同 scan/merge 一樣 */
const titleMapOf = (arc: TitledArc, firstNo: number): Map<number, string> => {
    const map = new Map<number, string>();
    const list = Array.isArray(arc.episodes) ? arc.episodes : [];
    list.forEach((title, i) => {
        if (typeof title === 'string' && title !== '') map.set(firstNo + i, title);
    });
    Object.entries(arc.titles ?? {}).forEach(([no, title]) => map.set(Number(no), title));
    return map;
};

export const formatTitleLine = (no: number, title = ''): string =>
    `第 ${no} 集 ${TITLE_SEPARATOR} ${title}`;

/** arc → textarea 文字（每集一行；集數未知就空字串） */
export const formatTitles = (arc: TitledArc): string => {
    const firstNo = arc.firstNo ?? DEFAULT_FIRST_NO;
    const titles = titleMapOf(arc, firstNo);
    return Array.from({ length: countOf(arc) }, (_, i) =>
        formatTitleLine(firstNo + i, titles.get(firstNo + i)),
    ).join(LINE_BREAK);
};

const lineError = (line: number, kind: TitleErrorKind, detail: string): TitleError => ({
    line,
    kind,
    message: `第 ${line} 行：${detail}`,
});

interface LineContext {
    firstNo: number;
    last: number;
    /** 集數 → 第一次出現嘅行 */
    seenAt: Map<number, number>;
}

type LineResult = { no: number; title: string } | TitleError | undefined;

/** 一行 → 集數 + 標題，或者錯誤；空行 undefined */
const parseLine = (raw: string, line: number, ctx: LineContext): LineResult => {
    const trimmed = raw.trim();
    if (trimmed === '') return undefined;
    const match = LINE_PATTERN.exec(trimmed);
    if (!match) return lineError(line, 'format', '格式要係「第 X 集 ｜ 標題」');
    const no = Number(match[1]);
    if (no < ctx.firstNo || no > ctx.last)
        return lineError(line, 'range', `第 ${no} 集超出範圍（第 ${ctx.firstNo}–${ctx.last} 集）`);
    const earlier = ctx.seenAt.get(no);
    if (earlier !== undefined)
        return lineError(line, 'duplicate', `第 ${no} 集重複（第 ${earlier} 行已經有）`);
    ctx.seenAt.set(no, line);
    return { no, title: (match[2] ?? '').trim() };
};

/** textarea 文字 → titles + 逐行錯誤；空行略過，有錯嘅行唔入 titles */
export const parseTitles = (text: string, firstNo: number, count: number): ParsedTitles => {
    const ctx: LineContext = { firstNo, last: firstNo + count - 1, seenAt: new Map() };
    const result: ParsedTitles = { titles: {}, errors: [] };
    text.split(LINE_BREAK).forEach((raw, i) => {
        const parsed = parseLine(raw, i + 1, ctx);
        if (parsed === undefined) return;
        if ('kind' in parsed) result.errors.push(parsed);
        else if (parsed.title !== '') result.titles[String(parsed.no)] = parsed.title;
    });
    return result;
};

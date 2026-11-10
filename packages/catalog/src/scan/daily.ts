/* 每日劇：劇集 folder 直接放 YYYYMMDD.m4a */
import { isCalendarDate } from '../date';
import { extensionOf } from './names';
import { DAILY_TEMPLATE, issue } from './shared';
import type { ArcSummary, DramaScan, Issue } from './types';

const DAILY_PATTERN = /^(\d{4})(\d{2})(\d{2})$/;
const DAILY_EXTENSION = '.m4a';

export interface DailyAnalysis {
    template: string;
    /** 新到舊 */
    dates: string[];
    issues: Issue[];
    summaries: ArcSummary[];
}

/** YYYYMMDD.m4a → YYYY-MM-DD；唔係就 undefined */
const dailyDateOf = (rawFile: string): string | undefined => {
    const file = rawFile.normalize('NFC');
    const ext = extensionOf(file);
    const match = DAILY_PATTERN.exec(file.slice(0, file.length - ext.length));
    const date = match ? `${match[1]}-${match[2]}-${match[3]}` : undefined;
    return date !== undefined && ext === DAILY_EXTENSION && isCalendarDate(date) ? date : undefined;
};

/** 新到舊排（同 c18 一樣）；檔名唔係 YYYYMMDD.m4a 就係錯誤 */
export const analyseDaily = (scan: DramaScan): DailyAnalysis => {
    const issues: Issue[] = [];
    const dates = scan.audio.flatMap((file) => {
        const date = dailyDateOf(file);
        if (date === undefined)
            issues.push(issue('error', scan.name, `每日劇檔名要係 YYYYMMDD.m4a：${file}`));
        return date === undefined ? [] : [date];
    });
    dates.sort().reverse();
    const summaries = [
        { name: scan.name, count: dates.length, first: dates.at(-1), last: dates[0] },
    ];
    return { template: DAILY_TEMPLATE, dates, issues, summaries };
};

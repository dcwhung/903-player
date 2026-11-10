/* scan 各部分共用：問題記錄、檔名 template token、短篇集數 / 檔名 */
import { renderFileName, toChineseNumeral, type FileNameTokens } from '../dramas/filename';
import type { DraftArc, Issue, IssueLevel } from './types';

/** 短篇劇檔名 template：第一個係常見寫法；第二個係檔名入面短篇名前面加埋劇名（黃金少年） */
export const SERIES_TEMPLATES: readonly string[] = [
    '{no2} - {arc} - 第{noZh}集[ - {title}].m4a',
    '{no2} - {folder}{arc} - 第{noZh}集[ - {title}].m4a',
];
export const DAILY_TEMPLATE = '{yyyymmdd}.m4a';

const FILE_NO_WIDTH = 2;
const FIRST_NO_DEFAULT = 1;

export const issue = (level: IssueLevel, where: string, message: string): Issue => ({
    level,
    where,
    message,
});

export const rangeOf = (first: number, last: number): number[] =>
    Array.from({ length: last - first + 1 }, (_, i) => first + i);

export const seriesTokens = (
    folder: string,
    arc: string,
    no: number,
    title: string,
): FileNameTokens => ({
    no: String(no),
    no2: String(no).padStart(FILE_NO_WIDTH, '0'),
    noZh: toChineseNumeral(no),
    arc,
    folder,
    title,
});

export const dailyTokens = (folder: string, date: string): FileNameTokens => ({
    date,
    yyyymmdd: date.replaceAll('-', ''),
    folder,
});

export const firstNoOf = (arc: DraftArc): number => arc.firstNo ?? FIRST_NO_DEFAULT;

/** 集數：episodes list 長度或者數字；未上架短篇可以冇（undefined） */
export const episodeCountOf = (arc: DraftArc): number | undefined =>
    Array.isArray(arc.episodes) ? arc.episodes.length : (arc.episodes as number | undefined);

/** audio.folder + audio.file：砌錄音檔名要用 */
export interface AudioNaming {
    audio: { folder: string; file: string };
}

/** 短篇某一集嘅真檔名：files 優先，否則用 template（集名：titles 優先，再到 episodes list） */
export const arcEpisodeFile = (json: AudioNaming, arc: DraftArc, no: number): string => {
    const listTitle = Array.isArray(arc.episodes) ? arc.episodes[no - firstNoOf(arc)] : undefined;
    const title = arc.titles?.[no] ?? listTitle ?? '';
    return (
        arc.files?.[no] ??
        renderFileName(json.audio.file, seriesTokens(json.audio.folder, arc.name, no, title))
    );
};

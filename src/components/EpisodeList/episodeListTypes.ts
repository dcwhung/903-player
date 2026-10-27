import type { EpisodeStatus } from './episodeStatus';

export interface EpisodeItem {
    key: string;
    /** 大字（節目：日/月；短篇劇集：集名） */
    dayMonth: string;
    /** 細字（節目：星期幾；短篇劇集：第 N 集） */
    weekday: string;
    /** 細字旁邊嘅標籤（例如每日劇集重播「重溫」）；冇就唔顯示 */
    tag?: string;
    current: boolean;
    /** 揀中而且播緊：掣變暫停，撳落去暫停 */
    isPlaying: boolean;
    status: EpisodeStatus;
}

/**
 * 行頭欄闊（成個清單一樣，進度條先對齊）：date 節目日子；taggedDate 日子加「重溫」標籤；
 * title 短篇劇集集名（長短唔一）
 */
export type EpisodeLabels = 'date' | 'taggedDate' | 'title';

/**
 * 揀中嗰集點樣捲入 panel：
 * nearest（預設，節目頁）= 見唔到先捲到最近位置；
 * top（短篇劇集）= 捲到頂、露出半行上一集，上面嘅舊集捲上就見
 */
export type EpisodeScrollAlign = 'nearest' | 'top';

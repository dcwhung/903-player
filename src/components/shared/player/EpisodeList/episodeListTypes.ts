import type { Track } from '../../../../types/track';
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
    /** 呢行嘅一集：有就喺播放掣左邊出收藏掣（P7 #7）；未上架冇 */
    track?: Track;
    /**
     * 快將下架（LE1）：狀態字後面琥珀色「⏳ 05/12 下架」（text）；欄太窄就淨係出「⏳ 05/12」（tag）；
     * 讀屏講長版日子（label）
     */
    leaving?: { text: string; tag: string; label: string } | undefined;
    /** 摺埋嘅未上架批次（status.kind = upcoming）：呢行代表幾多集（「共 N 集」照計） */
    episodeCount?: number | undefined;
    /** 摺埋批次嘅讀屏句（「第 11 至 20 集，19/11 星期四 上架」） */
    label?: string | undefined;
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

/**
 * 清單擺喺邊：page（節目頁 / 劇集頁左欄）；card（主頁闊橫版播放卡，欄窄，
 * 闊橫版狀態照舊可以換行，見 EpisodeList.module.css [data-variant='card']）
 */
export type EpisodeListVariant = 'page' | 'card';

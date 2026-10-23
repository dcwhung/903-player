export type DramaId = 'chisee' | 'c18';

/** series：分主題 × 集數（例如芝-See-菇-Bi-Family）；daily：大約一日一集，按日子排（例如 18-樓-C-座） */
export type DramaKind = 'series' | 'daily';

/** 主題劇集嘅一集：屬於邊個主題、主題入面第幾集 */
export interface SeriesEpisode {
    kind: 'series';
    dramaId: DramaId;
    url: string;
    /** 主題名（例如「X時mas時小提議」） */
    arc: string;
    /** 主題入面第幾集，由 1 開始 */
    no: number;
    /** 集名；檔名冇集名嘅集數冇 */
    title?: string;
}

/** 每日劇集嘅一集 */
export interface DailyEpisode {
    kind: 'daily';
    dramaId: DramaId;
    url: string;
    /** 播出日子，格式 YYYY-MM-DD */
    date: string;
    /** 重播舊集：清單標「重溫」 */
    rerun: boolean;
}

export type DramaEpisode = SeriesEpisode | DailyEpisode;

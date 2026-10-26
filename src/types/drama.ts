/** = src/dramas/<id>/ folder 名；清單由 drama.json 讀，所以唔係 closed union */
export type DramaId = string;

/** series：分短篇 × 集數（例如芝See菇Bi Family）；daily：大約一日一集，按日子排（例如 18 樓 C 座） */
export type DramaKind = 'series' | 'daily';

/** 短篇劇集嘅一集：屬於邊個短篇、短篇入面第幾集 */
export interface SeriesEpisode {
    kind: 'series';
    dramaId: DramaId;
    url: string;
    /** 短篇名（例如「X時mas時小提議」） */
    arc: string;
    /** 短篇入面第幾集，由 1 開始 */
    no: number;
    /** 集名；檔名冇集名嘅集數冇 */
    title?: string;
    /** 呢個短篇上架日子（YYYY-MM-DD）；冇就當舊短篇（唔出「新」） */
    addedAt?: string;
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

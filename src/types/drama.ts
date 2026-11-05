/** = src/catalog/dramas/library/<id>/ folder 名；清單由 drama.json 讀，所以唔係 closed union */
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
    /**
     * 呢集上架日子（YYYY-MM-DD，劇集 / 短篇 / 逐集 episodeDates 最遲嗰個）：
     * 將來 = 未上架（registry 唔畀出嚟）；冇就當舊短篇（唔出「新」）
     */
    addedAt?: string;
    /** 呢集下架日子（劇集 / 短篇 / 集數三層最早嗰個）：當日起唔再提供；冇就一直有 */
    removedAt?: string;
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
    /** 成套劇下架日（每日劇只有劇集層）：當日起唔再提供 */
    removedAt?: string;
}

export type DramaEpisode = SeriesEpisode | DailyEpisode;

/** 一段集數（first–last，包埋兩頭）同佢嘅日子：逐集上架批次、集數下架 */
export interface EpisodeRange {
    first: number;
    last: number;
    date: string;
}

/** 一個短篇嘅上架 / 下架資料（catalog 層，未按今日篩；UI 用 selectors/availability 計） */
export interface ArcAvailability {
    arc: string;
    firstNo: number;
    /** 集數；未上架短篇可以未知 */
    count?: number;
    /** 短篇實際上架日（短篇自己，冇就劇集嘅） */
    addedAt?: string;
    /** 短篇自己嘅下架日（唔計劇集嗰層） */
    removedAt?: string;
    /** 逐集上架：第二批起每批集數嘅上架日（第一批跟 addedAt） */
    batches: readonly EpisodeRange[];
    /** 集數下架：每段集數嘅下架日 */
    removals: readonly EpisodeRange[];
}

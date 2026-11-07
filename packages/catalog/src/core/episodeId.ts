/*
 * 穩定 episode ID：進度（progress:v2）同收藏（bookmarks:v2）嘅 key。
 * 唔包音檔 URL，所以換 R2 bucket / 搬 server / 改檔名 / 改 R2 folder 名都唔會冇咗進度。
 * 節目錄音冇 backend 記錄，ID 一定要 browser 由 showId + 日子自己計得返。
 * 格式一經發佈唔可以改（已儲資料靠佢搵返）；每劇 drama.test.ts pin 住第一 / 最後一集
 */

const SEPARATOR = ':';

/** ID 第一段：邊類節目 */
export const EPISODE_ID_KIND = { drama: 'drama', show: 'show' } as const;

const join = (...parts: readonly (string | number)[]): string => parts.join(SEPARATOR);

/** 短篇劇一集：drama:<dramaId>:<arcId>:<no>（arcId = drama.json arc 嘅 ASCII slug） */
export const seriesEpisodeId = (dramaId: string, arcId: string, no: number): string =>
    join(EPISODE_ID_KIND.drama, dramaId, arcId, no);

/** 每日劇一集：drama:<dramaId>:<YYYY-MM-DD> */
export const dailyEpisodeId = (dramaId: string, date: string): string =>
    join(EPISODE_ID_KIND.drama, dramaId, date);

/** 電台節目錄音：show:<showId>:<YYYY-MM-DD> */
export const showEpisodeId = (showId: string, date: string): string =>
    join(EPISODE_ID_KIND.show, showId, date);

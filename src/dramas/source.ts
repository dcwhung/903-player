/**
 * 劇集資料來源：一個 folder = 一套劇（drama.json + 圖）。
 * 而家只有 bundledSource（build time import.meta.glob）；將來換 remote manifest 只需
 * 再寫一個 DramaSource，registry / schema / episodes 全部唔使變。
 */
export interface DramaFolder {
    /** folder 名 = drama id = /drama/:id */
    id: string;
    /** 錯誤 message 用嘅檔案路徑（例如 src/dramas/golden/drama.json） */
    source: string;
    /** drama.json 原始內容，未驗證 */
    definition: unknown;
    /** folder 入面嘅圖：檔名 → 可以直接畀 <img src> 嘅 URL */
    images: Readonly<Record<string, string>>;
}

export interface DramaSource {
    folders(): readonly DramaFolder[];
}

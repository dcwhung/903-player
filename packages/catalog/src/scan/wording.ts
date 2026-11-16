/*
 * 掃描訊息嘅字眼（S-785）：admin 掃 R2 資料夾，講返用戶睇得明嘅嘢（唔提 CLI 參數 / 本機 folder）。
 * 本機 CLI（dramaFromFolder）2026-11-16 刪咗（S-751），所以只得 R2 一套；存完整句子，唔好砌
 */

export interface ScanWording {
    /** NFD 名：問題 + 下一步 */
    nfd: string;
    /** 現有設定有、掃描冇嘅短篇 / 日子（已保留） */
    missingArc: string;
    missingDay: string;
    /** 「同 ___ 唔一樣」嘅 ___ */
    folderName: string;
    /** 現有 drama.json（D1 存住嘅 definition）點稱呼，直接接中文 */
    existing: string;
    /** 劇 ID 點稱呼（後面接「「id」」） */
    id: string;
}

const NFD = 'Unicode 係 NFD 分解形式（macOS 常見）；drama.json 會用 NFC，';
const KEPT_ARC = '；已保留原設定，如果真係落咗架請手動刪';

/** R2 掃描（admin / API）嘅字眼 */
export const SCAN_WORDING: ScanWording = Object.freeze({
    nfd: `${NFD}網址可能對唔上 R2 嘅檔，請試播確認（或者喺 R2 改返 NFC 名）`,
    missingArc: `R2 資料夾冇呢個短篇${KEPT_ARC}`,
    missingDay: 'R2 資料夾冇呢日；已保留',
    folderName: 'R2 資料夾名',
    existing: '現有設定',
    id: '劇 ID',
});

/*
 * 掃描訊息嘅字眼（S-785）：同一套檢查，CLI（drama-from-folder 掃本機 folder）同
 * API（admin 掃 R2 資料夾）各自講返用戶睇得明嘅嘢。CLI 係預設，字眼同以前一個字都唔變。
 * 中英夾雜嘅空格唔一樣（「本機 folder 冇」vs「R2 資料夾冇」），所以存完整句子，唔好砌
 */
import type { ScanSource } from './types';

export interface ScanWording {
    /** NFD 名：問題 + 下一步 */
    nfd: string;
    /** 現有設定有、掃描冇嘅短篇 / 日子（已保留） */
    missingArc: string;
    missingDay: string;
    /** 「同 ___ 唔一樣」嘅 ___ */
    folderName: string;
    /**
     * 現有 drama.json 點稱呼，直接接中文（所以 CLI 版尾有空格）：
     * CLI 係 --existing 參數，API 係 D1 存住嘅 definition
     */
    existing: string;
    /** 劇 ID 點稱呼（後面接「「id」」） */
    id: string;
}

const NFD = 'Unicode 係 NFD 分解形式（macOS 常見）；drama.json 會用 NFC，';
const KEPT_ARC = '；已保留原設定，如果真係落咗架請手動刪';

const WORDING: Readonly<Record<ScanSource, ScanWording>> = {
    folder: {
        nfd: `${NFD}上載後請用 --verify 確認`,
        missingArc: `本機 folder 冇呢個短篇${KEPT_ARC}`,
        missingDay: '本機 folder 冇呢日；已保留',
        folderName: '本機 folder 名',
        existing: '--existing ',
        id: '--id',
    },
    r2: {
        nfd: `${NFD}網址可能對唔上 R2 嘅檔，請試播確認（或者喺 R2 改返 NFC 名）`,
        missingArc: `R2 資料夾冇呢個短篇${KEPT_ARC}`,
        missingDay: 'R2 資料夾冇呢日；已保留',
        folderName: 'R2 資料夾名',
        existing: '現有設定',
        id: '劇 ID',
    },
};

export const wordingOf = (source: ScanSource = 'folder'): ScanWording => WORDING[source];

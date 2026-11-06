import type { SavedLayout, ThirdTab } from '../../../../selectors/bookmarks';
import type { Track } from '../../../../types/track';

/** 收藏 tab 一行（一集） */
export interface SavedRowView {
    /** 音檔網址 */
    key: string;
    /** 行頭：日子（17/10（六））/ 集數（第 2 集） */
    label: string;
    /** 讀屏名用嘅行頭：日子讀「17/10 星期六」（A3）/ 集數 */
    spokenLabel: string;
    /** 右邊狀態：播放中 / 聽到 x / y / 已收聽 / 未收聽 */
    status: string;
    /** 進度線 0–1 */
    ratio: number;
    /** 播緊：掣變 ⏸（pill / 紅條睇 onAir；冇底框，字用普通色） */
    playing: boolean;
    /** player 載入緊呢集（播緊 / 暫停都係）：暫停就左邊灰條、照寫聽到邊 */
    current: boolean;
    /** 播緊而且知道時長：「播放中」pill + 紅條；連線中（S-730）寫「連線中…」、灰條 */
    onAir: boolean;
    /** 讀屏：節目 / 劇名（+ 短篇） */
    name: string;
    /** 撳行（掣以外）：入嗰集節目頁 / 劇集頁，唔播（data-zoom-key 由佢 zoom 入頁） */
    zoomKey: string;
    onOpen: () => void;
    /** 撳 ▷ / ⏸：原地播 / 暫停，留喺收藏 tab */
    onPlay: () => void;
    /** 左滑過四成（或者撳 Delete）：移除收藏 */
    onRemove: () => void;
    /** 已下架（P8 #6）：灰色「已下架」行，冇播放掣、撳唔到（aria-disabled），照可以左滑移除 */
    removed?: boolean | undefined;
    /** 快將下架（LB1）：狀態字後面琥珀字（text），讀屏講長版日子（label） */
    leaving?: { text: string; label: string } | undefined;
}

/** box 入面一段：左邊碟；短篇劇每個短篇一段，段頭寫短篇名 */
export interface SavedSectionView {
    key: string;
    art: string;
    heading?: string;
    rows: readonly SavedRowView[];
}

/** 一個節目 / 一套劇 */
export interface SavedBoxView {
    key: string;
    kind: 'show' | 'drama';
    title: string;
    /** 大類橫圖（主頁節目 / 劇集格嘅圖） */
    banner: string;
    /** 成套劇已下架：banner 變灰 */
    removed?: boolean | undefined;
    sections: readonly SavedSectionView[];
}

/** 最近收聽一行 */
export interface RecentRowView {
    key: string;
    name: string;
    label: string;
    /** 讀屏名用：日子讀「17/10 星期六」（A3） */
    spokenLabel: string;
    art: string;
    track: Track;
    /** 快將下架（LR1）：第二行琥珀字 */
    leaving?: { text: string; label: string } | undefined;
    onOpen: () => void;
}

export interface SavedTabView {
    /**
     * saved = 有收藏：收藏 box + 最近收聽 panel；recent = 冇收藏：成個 tab 係最近收聽清單
     * （_mockups_/qr-transfer ① A / B）
     */
    mode: ThirdTab;
    layout: SavedLayout;
    boxes: readonly SavedBoxView[];
    recent: readonly RecentRowView[];
    /** 收藏 box 分幾欄（savedGrid） */
    columns: number;
    solo: boolean;
    /** 冇收藏版最近收聽分幾欄（recentColumns） */
    recentColumns: number;
}

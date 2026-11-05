import type { SavedLayout } from '../../../../selectors/bookmarks';
import type { Track } from '../../../../types/track';

/** 收藏 tab 一行（一集） */
export interface SavedRowView {
    /** 音檔網址 */
    key: string;
    /** 行頭：日子（17/10（六））/ 集數（第 2 集） */
    label: string;
    /** 右邊狀態：播放中 / 聽到 x / y / 已聽完 / 未收聽 */
    status: string;
    /** 進度線 0–1 */
    ratio: number;
    /** 播緊：行深少少、字變 cream、掣變 ⏸ */
    playing: boolean;
    /** 讀屏：節目 / 劇名（+ 短篇） */
    name: string;
    /** 撳行（掣以外）：入嗰集節目頁 / 劇集頁，唔播（data-zoom-key 由佢 zoom 入頁） */
    zoomKey: string;
    onOpen: () => void;
    /** 撳 ▷ / ⏸：原地播 / 暫停，留喺收藏 tab */
    onPlay: () => void;
    /** 左滑過四成（或者撳 Delete）：移除收藏 */
    onRemove: () => void;
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
    sections: readonly SavedSectionView[];
}

/** 最近收聽一行 */
export interface RecentRowView {
    key: string;
    name: string;
    label: string;
    art: string;
    track: Track;
    onOpen: () => void;
}

export interface SavedTabView {
    layout: SavedLayout;
    boxes: readonly SavedBoxView[];
    recent: readonly RecentRowView[];
    columns: number;
    solo: boolean;
}

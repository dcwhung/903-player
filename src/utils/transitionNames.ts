// 唔用 DOM：node 測試（global.css 對名）都 import 得

/** 過場時兩邊同名就移位變形嘅元素（global.css 揀動畫） */
export const TRANSITION_NAME = {
    /** 主頁播放卡 ↔ 節目 / 劇集頁成頁底 */
    panel: 'player-panel',
    /** 唱片格（唱片 + 弧形 + 播放掣） */
    gauge: 'player-gauge',
    /** 播放卡頁頭列節目名 ↔ 內頁頁頭 */
    title: 'player-title',
    /** 播放卡收埋後右邊嘅把手 */
    handle: 'player-handle',
    banner: 'home-banner',
} as const;

/**
 * 主頁每格（按排位，橫額之後由 0 數起）：收埋 / 再出返播放卡時同一張卡排位唔變，由舊位移去新位。
 * 用排位而唔係卡嘅 key：key 可以有任何字元，換字會撞名（撞名成個過場會 abort，S-633）
 */
export const tileTransitionName = (index: number): string => `home-tile-${index}`;

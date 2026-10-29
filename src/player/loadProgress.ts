import { STALL_DATA_AHEAD_SECONDS } from '../config/constants';

/** 某一刻嘅載入狀態（卡住 watchdog 每次 arm / 到期時問一次） */
export interface LoadProbe {
    /** 包住而家位置嗰段已載入範圍嘅尾；未載到就 undefined */
    bufferedEnd: number | undefined;
    readyState: number;
    currentTime: number;
}

/**
 * 仲載緊而且有進展（慢網）：唔好 reload，否則會 abort 緊進行中嘅下載（W-498）。
 * 冇增長（S-551 情境 1：轉網絡後 stalled）或者前面已經有夠數據但位置唔行
 * （情境 2：pipeline 死咗）都唔算進展，照樣重試
 */
export const isLoadProgressing = (before: LoadProbe, after: LoadProbe): boolean => {
    const endBefore = before.bufferedEnd ?? Number.NEGATIVE_INFINITY;
    const endAfter = after.bufferedEnd ?? Number.NEGATIVE_INFINITY;
    const grew = endAfter > endBefore || after.readyState > before.readyState;
    const ahead = (after.bufferedEnd ?? after.currentTime) - after.currentTime;
    return grew && ahead < STALL_DATA_AHEAD_SECONDS;
};

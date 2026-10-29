import { STALL_DATA_AHEAD_SECONDS } from '../config/constants';
import { HAVE_CURRENT_DATA, HAVE_FUTURE_DATA } from './mediaReadyState';

/** 某一刻嘅載入狀態（卡住 watchdog 每次 arm / 到期時問一次） */
export interface LoadProbe {
    /** 包住而家位置嗰段已載入範圍嘅尾；未載到就 undefined */
    bufferedEnd: number | undefined;
    readyState: number;
    currentTime: number;
    /** 今次嘗試（開播 / 重試）已經發過 playing */
    playingFired: boolean;
}

/** 有新數據：buffer 尾增長，或者（未發 playing 時）readyState 升到有可播數據 */
const hasGrown = (before: LoadProbe, after: LoadProbe): boolean => {
    const endBefore = before.bufferedEnd ?? Number.NEGATIVE_INFINITY;
    const endAfter = after.bufferedEnd ?? Number.NEGATIVE_INFINITY;
    if (after.playingFired) {
        // S-583：playing 已發而位置唔行，rs 升只係反映 element 以為可以播，唔代表下載仲要時間。
        // element 話數據夠播（rs ≥ 3）就連 buffer 增長都唔算：位置唔行唔係下載問題（情境 2 pipeline 死咗），
        // 等落去冇用；只有跌返去等數據（waiting，rs ≤ 2）時 buffer 增長先係真慢網（W-498）
        return after.readyState < HAVE_FUTURE_DATA && endAfter > endBefore;
    }
    // 有可播數據（HAVE_CURRENT_DATA）先算進展。HAVE_METADATA 只係 header / 長度；當進展會將情境 1
    // 首次重試由 4 秒推到 8 秒，正正落入 iOS 鎖屏凍結 JS 嘅時間（W-500）
    const gotData = after.readyState >= HAVE_CURRENT_DATA && after.readyState > before.readyState;
    return endAfter > endBefore || gotData;
};

/**
 * 仲載緊而且有進展（慢網）：唔好 reload，否則會 abort 緊進行中嘅下載（W-498）。
 * 冇增長（S-551 情境 1：轉網絡後 stalled）、前面已經有夠數據但位置唔行，
 * 或者 playing 已發、數據夠播但位置唔行（情境 2：pipeline 死咗，S-583）都唔算進展，照樣重試
 */
export const isLoadProgressing = (before: LoadProbe, after: LoadProbe): boolean => {
    const ahead = (after.bufferedEnd ?? after.currentTime) - after.currentTime;
    return hasGrown(before, after) && ahead < STALL_DATA_AHEAD_SECONDS;
};

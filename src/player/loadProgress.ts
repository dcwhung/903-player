import { STALL_DATA_AHEAD_SECONDS } from '../config/constants';
import { HAVE_CURRENT_DATA, HAVE_FUTURE_DATA, HAVE_METADATA } from './mediaReadyState';

/** 某一刻嘅載入狀態（卡住 watchdog 每次 arm / 到期時問一次） */
export interface LoadProbe {
    /** 包住而家位置嗰段已載入範圍嘅尾；未載到就 undefined */
    bufferedEnd: number | undefined;
    readyState: number;
    currentTime: number;
    /** 今次嘗試（開播 / 重試）已經發過 playing */
    playingFired: boolean;
    /**
     * 收過幾多次 progress event（只會加）：bytes 入緊。metadata 未到時 Chromium 唯一嘅下載訊號，
     * buffered / readyState 都未郁（CUI-0011）
     */
    progressEvents: number;
    /**
     * 前景、今次載入仲喺網絡攞緊（NETWORK_LOADING）而未發過 stalled：Chromium metadata 前唔發 progress，
     * 呢個係極慢網開播唯一嘅「仲載緊」訊號；斷咗網約 3 s 會發 stalled（CUI-0011）。
     * 鎖屏唔算：唔係進展證據，鎖屏 Play 要照舊 reload（W-514）
     */
    fetching: boolean;
}

/** 有新數據：buffer 尾增長，或者（未發 playing 時）readyState 升到有可播數據，或者 metadata 未到前有新 progress event */
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
    // CUI-0011：極慢網開播 header 未載完，bytes 入緊（有新 progress event）都算；reload 會 abort 個 request
    // 由 byte 0 再嚟。progress 停咗（情境 1 轉網絡後乜都冇嚟）就冇新 event，照樣喺 deadline 重試。
    // metadata 到咗之後就由 buffered / readyState 話事：否則 header 後一個 progress 就將重試推到 8 秒（W-505）
    const beforeMetadata = after.readyState < HAVE_METADATA;
    const gotBytes = beforeMetadata && after.progressEvents > before.progressEvents;
    // CUI-0011：Chromium metadata 前連 progress 都冇，仲連緊網而未 stalled 就當載緊（上限照用 STALL_MAX_WAIT_MS）
    const stillFetching = beforeMetadata && after.fetching;
    return endAfter > endBefore || gotData || gotBytes || stillFetching;
};

/**
 * 仲載緊而且有進展（慢網，包括 metadata 未到前不斷有 progress event）：唔好 reload，
 * 否則會 abort 緊進行中嘅下載（W-498、CUI-0011）。
 * 冇增長（S-551 情境 1：轉網絡後 stalled）、前面已經有夠數據但位置唔行，
 * 或者 playing 已發、數據夠播但位置唔行（情境 2：pipeline 死咗，S-583）都唔算進展，照樣重試
 */
export const isLoadProgressing = (before: LoadProbe, after: LoadProbe): boolean => {
    const ahead = (after.bufferedEnd ?? after.currentTime) - after.currentTime;
    return hasGrown(before, after) && ahead < STALL_DATA_AHEAD_SECONDS;
};

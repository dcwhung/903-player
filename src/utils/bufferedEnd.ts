/**
 * 包住而家位置嗰段已載入範圍嘅尾（秒）；而家位置未載到就 undefined。
 * 播放 log 用嚟分「冇數據」定「有數據但唔播」，卡住 watchdog 用嚟睇下載有冇進展（S-551 / W-498）
 */
export const bufferedEnd = (media: HTMLMediaElement): number | undefined => {
    // 舊瀏覽器 / 假 element 可能冇 buffered
    const ranges = media.buffered as TimeRanges | undefined;
    const count = ranges?.length ?? 0;
    for (let index = 0; ranges && index < count; index += 1) {
        const end = ranges.end(index);
        if (ranges.start(index) <= media.currentTime && media.currentTime <= end) {
            return end;
        }
    }
    return undefined;
};

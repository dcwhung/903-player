/**
 * 拖動速度樣本（今日節目卡疊橫拖、sheet 向下拉閂共用）：
 * 只保留最近 VELOCITY_WINDOW_MS 嘅樣本，頭尾相減計速度
 */

/** 計甩動速度只睇最近呢段時間，停低咗再放手就唔算甩 */
export const VELOCITY_WINDOW_MS = 100;

/** 一個拖動樣本：x 係拖動方向嘅座標（直向拖就裝 y） */
export interface DragSample {
    x: number;
    t: number;
}

/** 加一個拖動樣本，順手掉走速度窗口以外嘅舊樣本 */
export const pushSample = (samples: DragSample[], sample: DragSample): DragSample[] =>
    [...samples, sample].filter((s) => sample.t - s.t <= VELOCITY_WINDOW_MS);

/** 最近樣本嘅速度（px/ms，負數 = 向左 / 向上） */
export const velocityOf = (samples: DragSample[]): number => {
    const first = samples[0];
    const last = samples[samples.length - 1];
    if (!first || !last || last.t <= first.t) return 0;
    return (last.x - first.x) / (last.t - first.t);
};

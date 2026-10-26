/** 直版疊卡書架嘅尺寸（由 CSS 量，見 useShelfFocus） */
export interface ShelfMetrics {
    /** 每張卡之間嘅距離（一行高；卡高過一行，所以會蓋住下一張） */
    stepPx: number;
    /** 書架頂嘅留白（第一張卡頂） */
    topPx: number;
    /** focus 卡上面露出上一張卡幾多 */
    peekPx: number;
}

/** 第 index 張卡做 focus 時書架捲到幾多：釘頂但留 peek；第一張冇上一張，貼返頂（0） */
export const snapTop = (index: number, { stepPx, topPx, peekPx }: ShelfMetrics): number =>
    Math.max(0, index * stepPx + topPx - peekPx);

/** 捲到 scrollTop 時邊張卡喺 snap 位（最近嗰張）；未量到尺寸當第一張 */
export const focusIndexAt = (
    scrollTop: number,
    count: number,
    { stepPx, topPx, peekPx }: ShelfMetrics,
): number => {
    if (stepPx <= 0) return 0;
    const index = Math.round((scrollTop + peekPx - topPx) / stepPx);
    return Math.min(Math.max(0, count - 1), Math.max(0, index));
};

/**
 * 書架底要留幾多位，最尾一張卡先捲得到 snap 位：
 * 最大 scrollTop（頂留白 + n 行 + 底留位 − 可見高）要等於 snapTop(n − 1)
 */
export const tailPadding = (clientHeight: number, { stepPx, peekPx }: ShelfMetrics): number =>
    Math.max(0, clientHeight - stepPx - peekPx);

interface Tap {
    index: number;
    /** 撳落去嗰刻邊張係 focus */
    focusAtPress: number;
    /** 鍵盤 / 讀屏觸發（冇 pointer，click 嘅 detail 係 0） */
    keyboard: boolean;
}

/**
 * 撳卡：撳 focus 卡入劇集頁；撳暗咗嘅卡只係捲佢做 focus。
 * 鍵盤 / 讀屏一律入頁：鍵盤 Tab 過去已經捲咗做 focus，讀屏用家唔使撳兩次
 */
export const tapAction = ({ index, focusAtPress, keyboard }: Tap): 'open' | 'focus' =>
    keyboard || index === focusAtPress ? 'open' : 'focus';

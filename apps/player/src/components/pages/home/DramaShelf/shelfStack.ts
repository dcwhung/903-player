interface StackInput {
    /** 書架可以用嘅高（扣走上下留白） */
    heightPx: number;
    /** 卡闊（扣走左右留白） */
    widthPx: number;
    count: number;
    /** 唔疊時卡之間嘅距離 */
    gapPx: number;
    /** 卡最矮 = 闊 × minRatio（2:1） */
    minRatio: number;
    /** 唔使疊時卡最高 = 闊 × maxRatio */
    maxRatio: number;
    /** 疊卡間距最細；再擠就固定呢個間距，書架上下捲 */
    minStepPx: number;
}

export interface StackLayout {
    /** 每張卡幾高 */
    cardPx: number;
    /** 每張卡頂之間嘅距離（細過卡高就係疊住） */
    stepPx: number;
    /** 放唔晒，書架要上下捲（T2 嘅 snap + focus） */
    scrolls: boolean;
}

/**
 * 直版疊卡書架點排（T8）：
 * 1. 全部最矮（2:1）都唔使疊就放得落：唔疊，平分高度但最高 maxRatio，剩低留喺最底
 * 2. 否則疊住，最矮卡高，間距計到最後一張卡底剛好到書架底
 * 3. 間距細過 minStepPx 就用 minStepPx，書架上下捲
 * 未量到尺寸（jsdom / 第一次 render）冇答案，CSS 照用預設
 */
export const stackLayout = ({
    heightPx,
    widthPx,
    count,
    gapPx,
    minRatio,
    maxRatio,
    minStepPx,
}: StackInput): StackLayout | undefined => {
    if (widthPx <= 0 || heightPx <= 0 || count <= 0) return undefined;
    const minCardPx = widthPx * minRatio;
    const gapsPx = (count - 1) * gapPx;
    if (count * minCardPx + gapsPx <= heightPx) {
        const cardPx = Math.min((heightPx - gapsPx) / count, widthPx * maxRatio);
        return { cardPx, stepPx: cardPx + gapPx, scrolls: false };
    }
    const stepPx = count > 1 ? (heightPx - minCardPx) / (count - 1) : 0;
    if (stepPx < minStepPx) return { cardPx: minCardPx, stepPx: minStepPx, scrolls: true };
    return { cardPx: minCardPx, stepPx, scrolls: false };
};

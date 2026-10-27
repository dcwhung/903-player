/** 向下拉過表高咁多先閂（未夠就彈返） */
export const SHEET_DISMISS_RATIO = 0.25;
/** 放手前向下甩得咁快（px/ms）都閂，就算拉得唔夠遠 */
export const SHEET_FLICK_VELOCITY_PX_PER_MS = 0.6;
/** 甩都要拉過咁多 px 先算，撳一下手指抖咗唔會閂 */
export const SHEET_FLICK_MIN_PX = 24;
/** 閂 / 彈返動畫時長（同 ArcSheet.module.css --arc-sheet-slide-ms 一致） */
export const SHEET_SLIDE_MS = 250;

/** 表跟手指向下移咗幾多 px；向上推唔會高過原位 */
export const sheetOffset = (startY: number, y: number): number => Math.max(0, y - startY);

interface DismissInput {
    /** 表而家向下移咗幾多 px */
    offset: number;
    /** 表本身高度 */
    height: number;
    /** 放手前嘅速度（px/ms，正數 = 向下） */
    velocity: number;
}

/** 放手時決定閂定彈返：拉過表高 25%，或者向下甩得夠快（兼拉過少少）就閂 */
export const shouldDismissSheet = ({ offset, height, velocity }: DismissInput): boolean => {
    if (offset <= 0) return false;
    if (offset >= height * SHEET_DISMISS_RATIO) return true;
    return velocity >= SHEET_FLICK_VELOCITY_PX_PER_MS && offset >= SHEET_FLICK_MIN_PX;
};

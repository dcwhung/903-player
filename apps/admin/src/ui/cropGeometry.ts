/*
 * 裁切編輯器嘅純幾何：候選（置中裁切 / 完整 · 模糊背景 / 完整 · 延伸邊緣）、
 * 拖曳裁切框（移位 + 右下角縮放，鎖輸出比例、限喺原圖入面）、原圖細過輸出要放大幾多倍
 * Design Origin: mockup: _mockups_/admin-phase4/index.html#b（fitCenterBox / 拖框 / 縮放）
 */
import type { Size } from './imageUpload';

export const CROP_MODE = {
    CENTER: 'center',
    BLUR: 'blur',
    EXTEND: 'extend',
} as const;

export type CropMode = (typeof CROP_MODE)[keyof typeof CROP_MODE];

/** 候選次序（中間一行掣） */
export const CROP_MODES: readonly CropMode[] = [CROP_MODE.CENTER, CROP_MODE.BLUR, CROP_MODE.EXTEND];

export interface CropRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface DragDelta {
    dx: number;
    dy: number;
}

/** 縮細裁切框最細 = 最大框嘅幾分之一（太細冇意思，亦唔好撳唔返個角） */
const MIN_BOX_FRACTION = 0.2;
/** 放大倍數顯示到小數點後兩位 */
const FACTOR_DECIMALS = 100;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** 最大嘅置中裁切框（同 target 一樣比例），之後縮放到 target */
export const centerCrop = (source: Size, target: Size): CropRect => {
    const scale = Math.max(target.width / source.width, target.height / source.height);
    const width = Math.min(source.width, Math.round(target.width / scale));
    const height = Math.min(source.height, Math.round(target.height / scale));
    return {
        x: Math.round((source.width - width) / 2),
        y: Math.round((source.height - height) / 2),
        width,
        height,
    };
};

/** 成張圖放入 target 入面（唔裁）：fit-blur / fit-extend 用，回傳喺 target 座標 */
export const fitRect = (source: Size, target: Size): CropRect => {
    const scale = Math.min(target.width / source.width, target.height / source.height);
    const width = source.width * scale;
    const height = source.height * scale;
    return { x: (target.width - width) / 2, y: (target.height - height) / 2, width, height };
};

/** 拖成個框：限喺原圖入面 */
export const moveBox = (box: CropRect, { dx, dy }: DragDelta, source: Size): CropRect => ({
    ...box,
    x: clamp(box.x + dx, 0, source.width - box.width),
    y: clamp(box.y + dy, 0, source.height - box.height),
});

/** 拖右下角：鎖輸出比例，左上角唔郁；唔可以出原圖、唔可以細過最大框嘅 1/5 */
export const resizeBox = (
    box: CropRect,
    { dx, dy }: DragDelta,
    source: Size,
    target: Size,
): CropRect => {
    const ratio = target.width / target.height;
    const maxWidth = Math.min(source.width - box.x, (source.height - box.y) * ratio);
    const minWidth = Math.min(source.width, source.height * ratio) * MIN_BOX_FRACTION;
    // 跟拖得多嗰個方向（mockup 用 max，淨係向左拖會縮唔到）
    const vertical = dy * ratio;
    const grow = Math.abs(dx) >= Math.abs(vertical) ? dx : vertical;
    const width = clamp(box.width + grow, minWidth, maxWidth);
    return { ...box, width, height: width / ratio };
};

/** 原圖細過輸出：置中裁切要放大幾多倍（≥ 1；1 = 唔使放大） */
export const upscaleFactor = (source: Size, target: Size): number => {
    const factor = Math.max(target.width / source.width, target.height / source.height, 1);
    return Math.round(factor * FACTOR_DECIMALS) / FACTOR_DECIMALS;
};

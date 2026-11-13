/*
 * 將一個候選畫落 canvas（任何大細：候選縮圖、播放器預覽、標準尺寸輸出都用同一個 function）
 * Design Origin: mockup: _mockups_/admin-phase4/index.html#b（renderTo）
 * - 置中裁切：裁切框 → 成個 canvas
 * - 完整 · 模糊背景：底層 = 置中裁切 ctx.filter 模糊 + 壓暗（舊 Safari 冇 filter：縮到好細再放大）；上面放成張圖
 * - 完整 · 延伸邊緣：最外一行 / 一列像素拉闊填空位，上面放成張圖
 */
import { CROP_MODE, centerCrop, fitRect, type CropMode, type CropRect } from './cropGeometry';
import type { Size } from './imageUpload';

export interface CropChoice {
    mode: CropMode;
    /** 置中裁切嘅框（原圖座標）；fit 兩款唔用 */
    box: CropRect;
}

interface DrawSource {
    image: CanvasImageSource;
    source: Size;
}

type CreateCanvas = (width: number, height: number) => HTMLCanvasElement;

/** 模糊背景：縮到 1/24 再放大 */
const BLUR_DOWNSCALE = 24;
/** 模糊背景壓暗，等前面張圖突出 */
const BLUR_DIM = 'rgb(0 0 0 / 0.18)';
/** 延伸邊緣：拉闊嘅像素條同圖重疊 1px，唔會見到隙 */
const EDGE_OVERLAP = 1;
/** 空位細過半個像素就唔使延伸 */
const MIN_GAP = 0.5;

/** ctx.filter（Chrome / Firefox / Safari 18+）：真模糊 + 壓暗，邊放大少少遮住模糊後嘅透明邊 */
const FILTER_BLUR_DIVISOR = 30;
const FILTER_BRIGHTNESS = 0.85;
const FILTER_BLEED = 0.05;

const drawFilteredBlur = (
    context: CanvasRenderingContext2D,
    { image, source }: DrawSource,
    size: Size,
) => {
    const cover = centerCrop(source, size);
    const radius = Math.round(size.width / FILTER_BLUR_DIVISOR);
    context.filter = `blur(${radius}px) brightness(${FILTER_BRIGHTNESS})`;
    context.drawImage(
        image,
        cover.x,
        cover.y,
        cover.width,
        cover.height,
        -size.width * FILTER_BLEED,
        -size.height * FILTER_BLEED,
        size.width * (1 + 2 * FILTER_BLEED),
        size.height * (1 + 2 * FILTER_BLEED),
    );
    context.filter = 'none';
};

const drawBlurBackground = (
    context: CanvasRenderingContext2D,
    from: DrawSource,
    size: Size,
    createCanvas: CreateCanvas,
) => {
    if (typeof context.filter === 'string') return drawFilteredBlur(context, from, size);
    const { image, source } = from;
    const cover = centerCrop(source, size);
    const small = createCanvas(
        Math.max(1, Math.round(size.width / BLUR_DOWNSCALE)),
        Math.max(1, Math.round(size.height / BLUR_DOWNSCALE)),
    );
    const smallContext = small.getContext('2d');
    if (!smallContext) return;
    smallContext.drawImage(
        image,
        cover.x,
        cover.y,
        cover.width,
        cover.height,
        0,
        0,
        small.width,
        small.height,
    );
    context.drawImage(small, 0, 0, size.width, size.height);
    context.fillStyle = BLUR_DIM;
    context.fillRect(0, 0, size.width, size.height);
};

const drawExtendedEdges = (
    context: CanvasRenderingContext2D,
    { image, source }: DrawSource,
    size: Size,
    fit: CropRect,
) => {
    const { width: iw, height: ih } = source;
    if (fit.x > MIN_GAP) {
        context.drawImage(image, 0, 0, 1, ih, 0, fit.y, fit.x + EDGE_OVERLAP, fit.height);
        const right = fit.x + fit.width - EDGE_OVERLAP;
        context.drawImage(image, iw - 1, 0, 1, ih, right, fit.y, size.width - right, fit.height);
    }
    if (fit.y > MIN_GAP) {
        context.drawImage(image, 0, 0, iw, 1, fit.x, 0, fit.width, fit.y + EDGE_OVERLAP);
        const bottom = fit.y + fit.height - EDGE_OVERLAP;
        context.drawImage(image, 0, ih - 1, iw, 1, fit.x, bottom, fit.width, size.height - bottom);
    }
};

/** 畫一個候選落 canvas（canvas 嘅 width / height = 輸出大細）；jsdom 冇 2d context 就乜都唔畫 */
export const drawChoice = (
    canvas: HTMLCanvasElement,
    from: DrawSource,
    { mode, box }: CropChoice,
    createCanvas: CreateCanvas,
) => {
    const context = canvas.getContext('2d');
    if (!context) return;
    const size = { width: canvas.width, height: canvas.height };
    context.imageSmoothingQuality = 'high';
    if (mode === CROP_MODE.CENTER) {
        context.drawImage(
            from.image,
            box.x,
            box.y,
            box.width,
            box.height,
            0,
            0,
            size.width,
            size.height,
        );
        return;
    }
    const fit = fitRect(from.source, size);
    if (mode === CROP_MODE.BLUR) drawBlurBackground(context, from, size, createCanvas);
    else drawExtendedEdges(context, from, size, fit);
    context.drawImage(from.image, fit.x, fit.y, fit.width, fit.height);
};

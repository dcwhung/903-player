/*
 * 上載前處理：Design Origin: mockup: _mockups_/admin-phase4/index.html#b / #c（裁切編輯器、載入 / 錯誤狀態）
 * 1. loadSource：類型 → 檔案大小（20 MB）→ 檔頭尺寸（8000 px，decode 前）→ createImageBitmap 真係 decode 一次
 *    （S-795：壞檔 server 驗唔到）→ decode 後再對一次尺寸（檔頭讀唔到嘅格式）
 * 2. renderOutput：按候選（置中裁切 / 完整 · 模糊背景 / 完整 · 延伸邊緣）畫落標準尺寸 canvas → WebP，
 *    再對 ASSET_MAX_BYTES（S-805）；原檔已經係啱尺寸 WebP 又冇郁就原封不動上載
 * Safari 嘅 canvas.toBlob('image/webp') 會靜靜雞出 PNG：見到唔係 WebP 就 lazy load
 * @jsquash/webp（libwebp wasm，jSquash 維護）再編碼一次；Chrome / Firefox 唔使載 wasm
 */
import { ASSET_MAX_BYTES } from '@903-player/catalog';
import { t } from '../i18n/t';
import { drawChoice, type CropChoice } from './cropRender';
import { CROP_MODE, centerCrop, type CropRect } from './cropGeometry';
import { readImageSize } from './imageHeader';
import {
    kilobytes,
    megabytes,
    SLOT_SIZES,
    SOURCE_MAX_BYTES,
    SOURCE_MAX_EDGE_PX,
    SOURCE_MAX_MB,
    type CropSlot,
    type Size,
} from './imageUpload';

export { centerCrop, type CropRect } from './cropGeometry';

const WEBP_TYPE = 'image/webp';
export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', WEBP_TYPE];
/** WebP 質素（0–1）：封面圖 0.85 夠清又細 */
const WEBP_QUALITY = 0.85;
const PERCENT = 100;
/** 檔頭只讀頭 512 KB：JPEG 嘅 EXIF / 縮圖段喺 SOF 前面，一般遠細過呢個數 */
const HEADER_BYTES = 512 * 1024;

export interface Decoded extends Size {
    close: () => void;
}

export type DecodedImage = Decoded & CanvasImageSource;

/** 可以換嘅 browser 功能（測試用假嘅） */
export interface ImageEnv {
    decode: (file: Blob) => Promise<DecodedImage>;
    createCanvas: (width: number, height: number) => HTMLCanvasElement;
    wasmEncode: (data: ImageData) => Promise<ArrayBuffer>;
}

/** decode 咗嘅原圖（dialog 開住期間保留，收 dialog 先 close） */
export interface LoadedSource {
    file: Blob;
    image: DecodedImage;
    source: Size;
}

export interface PreparedImage {
    blob: Blob;
    source: Size;
    target: Size;
    /** null = 原檔已經啱（WebP + 標準尺寸），冇裁冇轉 */
    crop: CropRect | null;
}

export type Failure = { error: string };

/** 預覽原圖上面嘅裁切框（百分比） */
export const cropBoxStyle = (source: Size, crop: CropRect) => ({
    left: `${(crop.x / source.width) * PERCENT}%`,
    top: `${(crop.y / source.height) * PERCENT}%`,
    width: `${(crop.width / source.width) * PERCENT}%`,
    height: `${(crop.height / source.height) * PERCENT}%`,
});

const loadWasmEncoder = async (data: ImageData): Promise<ArrayBuffer> => {
    const { default: encode } = await import('@jsquash/webp/encode');
    return encode(data, { quality: WEBP_QUALITY * PERCENT });
};

export const browserEnv: ImageEnv = {
    decode: (file) => createImageBitmap(file),
    createCanvas: (width, height) =>
        Object.assign(document.createElement('canvas'), { width, height }),
    wasmEncode: loadWasmEncoder,
};

const toBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
    new Promise((resolve) => canvas.toBlob(resolve, WEBP_TYPE, WEBP_QUALITY));

/** canvas → WebP Blob；browser 唔識（出咗 PNG / null）就用 wasm encoder（onWasm：顯示「準備編碼器」） */
export const encodeWebp = async (
    canvas: HTMLCanvasElement,
    wasmEncode: ImageEnv['wasmEncode'],
    onWasm?: () => void,
): Promise<Blob> => {
    const native = await toBlob(canvas);
    if (native?.type === WEBP_TYPE) return native;
    const context = canvas.getContext('2d');
    if (!context) throw new Error(t('images.encodeFailed'));
    onWasm?.();
    const data = context.getImageData(0, 0, canvas.width, canvas.height);
    return new Blob([await wasmEncode(data)], { type: WEBP_TYPE });
};

const tooLarge = ({ width, height }: Size) =>
    width > SOURCE_MAX_EDGE_PX || height > SOURCE_MAX_EDGE_PX;

const tooLargeError = ({ width, height }: Size): Failure => ({
    error: t('images.tooLargeSize', { width, height, max: SOURCE_MAX_EDGE_PX }),
});

/** 揀咗嘅檔 / R2 原圖 → decode 咗嘅原圖（或者錯誤文字）；超過上限唔 decode */
export const loadSource = async (
    file: Blob,
    env: ImageEnv = browserEnv,
): Promise<LoadedSource | Failure> => {
    if (!ACCEPTED_TYPES.includes(file.type)) return { error: t('images.badType') };
    if (file.size > SOURCE_MAX_BYTES)
        return {
            error: t('images.tooLargeFile', { mb: megabytes(file.size), max: SOURCE_MAX_MB }),
        };
    const header = readImageSize(new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer()));
    if (header && tooLarge(header)) return tooLargeError(header);
    let image: DecodedImage;
    try {
        image = await env.decode(file);
    } catch {
        return { error: t('images.undecodable') };
    }
    const source = { width: image.width, height: image.height };
    if (!tooLarge(source)) return { file, image, source };
    image.close();
    return tooLargeError(source);
};

const isUntouched = (loaded: LoadedSource, choice: CropChoice, target: Size) =>
    loaded.file.type === WEBP_TYPE &&
    loaded.source.width === target.width &&
    loaded.source.height === target.height &&
    choice.mode === CROP_MODE.CENTER &&
    choice.box.width === target.width &&
    choice.box.height === target.height;

/** 按候選畫落標準尺寸再轉 WebP；太大（> ASSET_MAX_BYTES）就錯誤文字 */
export const renderOutput = async (
    loaded: LoadedSource,
    choice: CropChoice,
    slot: CropSlot,
    env: ImageEnv = browserEnv,
    onWasm?: () => void,
): Promise<PreparedImage | Failure> => {
    const target = SLOT_SIZES[slot];
    const crop = choice.mode === CROP_MODE.CENTER ? choice.box : null;
    if (isUntouched(loaded, choice, target))
        return { blob: loaded.file, source: loaded.source, target, crop: null };
    try {
        const canvas = env.createCanvas(target.width, target.height);
        drawChoice(canvas, loaded, choice, env.createCanvas);
        const blob = await encodeWebp(canvas, env.wasmEncode, onWasm);
        if (blob.size > ASSET_MAX_BYTES)
            return {
                error: t('images.outputTooLarge', {
                    kb: kilobytes(blob.size),
                    max: kilobytes(ASSET_MAX_BYTES),
                }),
            };
        return { blob, source: loaded.source, target, crop };
    } catch {
        return { error: t('images.encodeFailed') };
    }
};

/** 置中裁切一步過（R2 原圖自動裁切用，唔開 dialog） */
export const prepareImage = async (
    file: Blob,
    slot: CropSlot,
    env: ImageEnv = browserEnv,
): Promise<PreparedImage | Failure> => {
    const loaded = await loadSource(file, env);
    if ('error' in loaded) return loaded;
    try {
        const box = centerCrop(loaded.source, SLOT_SIZES[slot]);
        return await renderOutput(loaded, { mode: CROP_MODE.CENTER, box }, slot, env);
    } finally {
        loaded.image.close();
    }
};

/*
 * 上載前處理（3c）：Design Origin: mockup: _mockups_/admin-style/index.html#f（⑥ 裁切預覽）
 * 收 PNG / JPG / WebP → createImageBitmap 真係 decode 一次（S-795：壞檔 server 驗唔到）→
 * 尺寸唔啱（或者唔係 WebP）就置中裁切 + 縮放到標準尺寸，canvas 轉 WebP。
 * Safari 嘅 canvas.toBlob('image/webp') 會靜靜雞出 PNG：見到唔係 WebP 就 lazy load
 * @jsquash/webp（libwebp wasm，jSquash 維護）再編碼一次；Chrome / Firefox 唔使載 wasm
 */
import { t } from '../i18n/t';
import { SLOT_SIZES, type ImageSlotKind, type Size } from './imageUpload';

const WEBP_TYPE = 'image/webp';
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', WEBP_TYPE];
/** WebP 質素（0–1）：封面圖 0.85 夠清又細 */
const WEBP_QUALITY = 0.85;
const PERCENT = 100;

export interface CropRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface Decoded extends Size {
    close: () => void;
}

/** 可以換嘅 browser 功能（測試用假嘅） */
export interface ImageEnv {
    decode: (file: Blob) => Promise<Decoded & CanvasImageSource>;
    createCanvas: (width: number, height: number) => HTMLCanvasElement;
    wasmEncode: (data: ImageData) => Promise<ArrayBuffer>;
}

export interface PreparedImage {
    blob: Blob;
    source: Size;
    target: Size;
    /** null = 原檔已經啱（WebP + 標準尺寸），冇裁冇轉 */
    crop: CropRect | null;
}

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

/** canvas → WebP Blob；browser 唔識（出咗 PNG / null）就用 wasm encoder */
export const encodeWebp = async (
    canvas: HTMLCanvasElement,
    wasmEncode: ImageEnv['wasmEncode'],
): Promise<Blob> => {
    const native = await toBlob(canvas);
    if (native?.type === WEBP_TYPE) return native;
    const context = canvas.getContext('2d');
    if (!context) throw new Error(t('images.encodeFailed'));
    const data = context.getImageData(0, 0, canvas.width, canvas.height);
    return new Blob([await wasmEncode(data)], { type: WEBP_TYPE });
};

const drawCropped = (image: CanvasImageSource, crop: CropRect, target: Size, env: ImageEnv) => {
    const canvas = env.createCanvas(target.width, target.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error(t('images.encodeFailed'));
    context.imageSmoothingQuality = 'high';
    context.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        target.width,
        target.height,
    );
    return canvas;
};

/** 揀咗嘅檔 → 可以上載嘅 WebP（或者錯誤文字） */
export const prepareImage = async (
    file: File,
    slot: ImageSlotKind,
    env: ImageEnv = browserEnv,
): Promise<PreparedImage | { error: string }> => {
    if (!ACCEPTED_TYPES.includes(file.type)) return { error: t('images.badType') };
    let image: Decoded & CanvasImageSource;
    try {
        image = await env.decode(file);
    } catch {
        return { error: t('images.undecodable') };
    }
    const source = { width: image.width, height: image.height };
    const target = SLOT_SIZES[slot];
    try {
        if (
            file.type === WEBP_TYPE &&
            source.width === target.width &&
            source.height === target.height
        )
            return { blob: file, source, target, crop: null };
        const crop = centerCrop(source, target);
        const blob = await encodeWebp(drawCropped(image, crop, target, env), env.wasmEncode);
        return { blob, source, target, crop };
    } catch {
        return { error: t('images.encodeFailed') };
    } finally {
        image.close();
    }
};

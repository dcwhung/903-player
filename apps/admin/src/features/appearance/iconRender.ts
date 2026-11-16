/*
 * App 圖示輸出 PNG：每張按自己裝置嘅裁切框畫落標準尺寸 canvas；maskable 先填遮罩底色，
 * 再將圖縮入中間 80% 安全區（iconModel.safeRect）。輸出再對 ASSET_MAX_BYTES 檢查（同封面一樣）
 */
import { ASSET_MAX_BYTES } from '@903-player/catalog';
import { t } from '../../i18n/t';
import type { CropRect } from '../../ui/cropGeometry';
import { browserEnv, type Failure, type ImageEnv, type LoadedSource } from '../../ui/imageCrop';
import { kilobytes } from '../../ui/imageUpload';
import { ICON_OUTPUTS, safeRect, type IconBoxes, type IconKey } from './iconModel';

export const PNG_TYPE = 'image/png';

/** background = null：成張 canvas 都係圖；有底色 = maskable（底色 + 安全區入面先係圖） */
export const drawIcon = (
    canvas: HTMLCanvasElement,
    image: CanvasImageSource,
    box: CropRect,
    background: string | null,
) => {
    const context = canvas.getContext('2d');
    if (!context) return;
    const size = { width: canvas.width, height: canvas.height };
    const area = background === null ? { x: 0, y: 0, ...size } : safeRect(size);
    context.imageSmoothingQuality = 'high';
    if (background !== null) {
        context.fillStyle = background;
        context.fillRect(0, 0, size.width, size.height);
    }
    const { x, y, width, height } = box;
    context.drawImage(image, x, y, width, height, area.x, area.y, area.width, area.height);
};

const toPng = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
    new Promise((resolve) => canvas.toBlob(resolve, PNG_TYPE));

export type IconBlobs = Record<IconKey, Blob>;

/** 五張 PNG（次序同 ICON_OUTPUTS）；任何一張轉唔到 / 太大 = 錯誤文字 */
export const renderIcons = async (
    loaded: LoadedSource,
    boxes: IconBoxes,
    background: string,
    env: Pick<ImageEnv, 'createCanvas'> = browserEnv,
): Promise<IconBlobs | Failure> => {
    const blobs: Partial<IconBlobs> = {};
    for (const { key, device, size, maskable } of ICON_OUTPUTS) {
        const canvas = env.createCanvas(size.width, size.height);
        drawIcon(canvas, loaded.image, boxes[device], maskable ? background : null);
        const blob = await toPng(canvas);
        if (blob?.type !== PNG_TYPE) return { error: t('appearance.icon.encodeFailed') };
        if (blob.size > ASSET_MAX_BYTES)
            return {
                error: t('images.outputTooLarge', {
                    kb: kilobytes(blob.size),
                    max: kilobytes(ASSET_MAX_BYTES),
                }),
            };
        blobs[key] = blob;
    }
    return blobs as IconBlobs;
};

/*
 * App 圖示輸出 PNG：每張按自己裝置嘅裁切框畫滿標準尺寸 canvas；maskable 先填遮罩底色（只會喺透明位見到），
 * 唔再縮入安全區：編輯器實線圈 = 遮罩邊界 = 成張圖，虛線圈（框嘅 80%）= 安全區（用戶 2026-11-16）。
 * 輸出再對 ASSET_MAX_BYTES 檢查（同封面一樣）
 */
import { ASSET_MAX_BYTES } from '@903-player/catalog';
import { t } from '../../i18n/t';
import type { CropRect } from '../../ui/cropGeometry';
import { browserEnv, type Failure, type ImageEnv, type LoadedSource } from '../../ui/imageCrop';
import { kilobytes } from '../../ui/imageUpload';
import { ICON_OUTPUTS, type IconBoxes, type IconKey } from './iconModel';

export const PNG_TYPE = 'image/png';

/** 裁切框畫滿成張 canvas；有底色 = maskable（先填底色，圖透明位後面先見到） */
export const drawIcon = (
    canvas: HTMLCanvasElement,
    image: CanvasImageSource,
    box: CropRect,
    background: string | null,
) => {
    const context = canvas.getContext('2d');
    if (!context) return;
    const { width: outWidth, height: outHeight } = canvas;
    context.imageSmoothingQuality = 'high';
    if (background !== null) {
        context.fillStyle = background;
        context.fillRect(0, 0, outWidth, outHeight);
    }
    const { x, y, width, height } = box;
    context.drawImage(image, x, y, width, height, 0, 0, outWidth, outHeight);
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

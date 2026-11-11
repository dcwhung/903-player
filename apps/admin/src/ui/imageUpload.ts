/*
 * 圖片 slot 上載前檢查：只收已裁好嘅 WebP（唱片 600×600、橫額 1216×684，同 apps/api ASSET_DIMENSIONS）。
 * 用 createImageBitmap 真係 decode 一次（S-795：header 啱但壞檔 server 驗唔到）
 */
import { t } from '../i18n/t';

export type ImageSlotKind = 'disc' | 'tile';

export const SLOT_SIZES: Record<ImageSlotKind, { width: number; height: number }> = {
    disc: { width: 600, height: 600 },
    tile: { width: 1216, height: 684 },
};

const WEBP_TYPE = 'image/webp';

export const sizeLabel = ({ width, height }: { width: number; height: number }) =>
    `${width}×${height}`;

/** 有問題回錯誤文字，冇就 undefined */
export const checkImageFile = async (
    file: File,
    slot: ImageSlotKind,
): Promise<string | undefined> => {
    if (file.type !== WEBP_TYPE) return t('images.notWebp');
    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch {
        return t('images.undecodable');
    }
    const actual = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    const wanted = SLOT_SIZES[slot];
    if (actual.width === wanted.width && actual.height === wanted.height) return undefined;
    return t('images.badSize', {
        slot: t(`images.${slot}`),
        size: sizeLabel(wanted),
        actual: sizeLabel(actual),
    });
};

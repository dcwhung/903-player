/*
 * App 圖示 dialog 嘅「上載」：按每個裝置嘅框畫五張 PNG →（原圖未存過先上載）→ 五張 PNG → branding.icon
 * （連原圖檔名 + 裁切框，下次撳預覽可以由原圖重新裁切）。成功收 dialog + 刷新；失敗留喺 dialog 顯示錯誤
 */
import { t } from '../../i18n/t';
import { renderIcons } from './iconRender';
import { uploadIcons } from './iconUpload';
import type { IconCrop } from './useIconCrop';

/** 五張 PNG（+ 原圖、裁切框）→ 上載 → branding.icon；回錯誤文字（成功 = undefined） */
const uploadFromCrop = async (crop: IconCrop): Promise<string | undefined> => {
    if (!crop.ready || !crop.boxes) return t('appearance.icon.encodeFailed');
    crop.setError(undefined);
    crop.setBusy(t('appearance.icon.rendering'));
    const blobs = await renderIcons(crop.ready.loaded, crop.boxes, crop.background);
    if ('error' in blobs) return blobs.error;
    return uploadIcons(blobs, crop.background, crop.setBusy, {
        file: crop.ready.file,
        storedName: crop.ready.seed.storedName,
        same: crop.same,
        boxes: crop.boxes,
    });
};

/** 上載 → 收 dialog → 刷新；留喺 dialog 顯示錯誤 */
export const useIconUpload = (crop: IconCrop, done: (message: string) => void) => async () => {
    const failed = await uploadFromCrop(crop);
    crop.setBusy(null);
    if (failed !== undefined) return crop.setError(failed);
    crop.session.close();
    done(t('appearance.icon.saved'));
};

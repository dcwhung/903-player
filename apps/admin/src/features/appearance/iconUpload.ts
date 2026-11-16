/*
 * App 圖示：原圖（未存過先上載，PUT /api/assets/source）→ 五張 PNG 逐張 PUT /api/assets（image/png）
 * → PUT /api/branding/icon（檔名 + 遮罩底色 + 原圖 + 裁切框，重新裁切用）；
 * 回錯誤文字（成功 = undefined）。中途失敗乜都唔寫（已上載嘅圖只係孤兒檔，無害）
 */
import { putBrandingIcon, uploadIconSource } from '../../api/brandingEndpoints';
import { uploadAsset } from '../../api/endpoints';
import { errorMessage } from '../../api/errorMessage';
import { t } from '../../i18n/t';
import { ICON_OUTPUTS, type IconBoxes, type IconKey } from './iconModel';
import { PNG_TYPE, type IconBlobs } from './iconRender';

/** 原圖：storedName 有 = 已經喺 R2（重新裁切），唔使再上載 file */
export interface IconSourceUpload {
    file: Blob;
    storedName?: string | undefined;
    same: boolean;
    boxes: IconBoxes;
}

const sourceName = async (source: IconSourceUpload, onBusy: (message: string) => void) => {
    if (source.storedName !== undefined) return source.storedName;
    onBusy(t('appearance.icon.uploadingSource'));
    return (await uploadIconSource(source.file)).name;
};

export const uploadIcons = async (
    blobs: IconBlobs,
    background: string,
    onBusy: (message: string) => void,
    source: IconSourceUpload,
): Promise<string | undefined> => {
    const names: Partial<Record<IconKey, string>> = {};
    try {
        const image = await sourceName(source, onBusy);
        for (const [index, { key }] of ICON_OUTPUTS.entries()) {
            onBusy(
                t('appearance.icon.uploadingIcon', {
                    index: index + 1,
                    count: ICON_OUTPUTS.length,
                }),
            );
            names[key] = (await uploadAsset(blobs[key], PNG_TYPE)).name;
        }
        await putBrandingIcon({
            ...(names as Record<IconKey, string>),
            maskableBackground: background,
            source: { image, same: source.same, boxes: source.boxes },
        });
        return undefined;
    } catch (error) {
        return errorMessage(error);
    }
};

/*
 * App 圖示：五張 PNG 逐張 PUT /api/assets（image/png）→ PUT /api/branding/icon（檔名 + 遮罩底色）；
 * 回錯誤文字（成功 = undefined）。中途失敗乜都唔寫（已上載嘅圖只係孤兒檔，無害）
 */
import { putBrandingIcon } from '../../api/brandingEndpoints';
import { uploadAsset } from '../../api/endpoints';
import { errorMessage } from '../../api/errorMessage';
import { t } from '../../i18n/t';
import { ICON_OUTPUTS, type IconKey } from './iconModel';
import { PNG_TYPE, type IconBlobs } from './iconRender';

export const uploadIcons = async (
    blobs: IconBlobs,
    background: string,
    onBusy: (message: string) => void,
): Promise<string | undefined> => {
    const names: Partial<Record<IconKey, string>> = {};
    try {
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
        });
        return undefined;
    } catch (error) {
        return errorMessage(error);
    }
};

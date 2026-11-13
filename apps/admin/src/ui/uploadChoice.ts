/*
 * 裁切好嘅原圖 → WebP → PUT /api/assets（封面 slot、首頁 Banner 兩張共用）；
 * onBusy 報告而家做緊乜（轉換 / 準備 wasm 編碼器 / 上載），dialog 顯示喺 busy note
 */
import { uploadAsset } from '../api/endpoints';
import { errorMessage } from '../api/errorMessage';
import { t } from '../i18n/t';
import type { CropChoice } from './cropRender';
import { browserEnv, renderOutput, type Failure, type LoadedSource } from './imageCrop';
import { kilobytes, sizeLabel, type CropSlot } from './imageUpload';

interface Croppable {
    loaded: LoadedSource;
    choice: CropChoice;
}

export const uploadChoice = async (
    ready: Croppable,
    slot: CropSlot,
    onBusy: (message: string) => void,
): Promise<{ name: string } | Failure> => {
    onBusy(t('images.converting'));
    const output = await renderOutput(ready.loaded, ready.choice, slot, browserEnv, () =>
        onBusy(t('images.preparingWasm')),
    );
    if ('error' in output) return output;
    onBusy(
        t('images.uploadingSize', {
            size: sizeLabel(output.target),
            kb: kilobytes(output.blob.size),
        }),
    );
    try {
        return await uploadAsset(output.blob);
    } catch (error) {
        return { error: errorMessage(error) };
    }
};

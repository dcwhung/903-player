/*
 * 重新裁切 App 圖示（icon recrop）：由 URL（R2 原圖 /catalog/v1/img/… 或者內建原圖）讀返原圖 → File，
 * 之後同揀檔一樣行 loadSource。Content-Type 唔係圖就跟副檔名估（loadSource 靠 type 判斷格式）
 */
import { t } from '../../i18n/t';
import type { Failure } from '../../ui/imageCrop';

const TYPE_OF_EXTENSION: Readonly<Record<string, string>> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
};

const IMAGE_TYPE_PREFIX = 'image/';

const typeOf = (blob: Blob, name: string) => {
    if (blob.type.startsWith(IMAGE_TYPE_PREFIX)) return blob.type;
    const extension = name.split('.').at(-1)?.toLowerCase() ?? '';
    return TYPE_OF_EXTENSION[extension] ?? blob.type;
};

const failed = (error: string): Failure => ({
    error: t('appearance.icon.sourceFailed', { error }),
});

export const fetchIconSource = async (url: string, name: string): Promise<File | Failure> => {
    try {
        const response = await fetch(url);
        if (!response.ok) return failed(`HTTP ${response.status}`);
        const blob = await response.blob();
        return new File([blob], name, { type: typeOf(blob, name) });
    } catch (error) {
        return failed(error instanceof Error ? error.message : String(error));
    }
};

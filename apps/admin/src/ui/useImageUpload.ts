/*
 * 圖片 slot 上載流程（3c）：揀檔 → prepareImage（類型、decode、置中裁切、WebP）→ 預覽 dialog →
 * 「上載」先 PUT /api/assets → onUploaded（caller 即刻存 entry）；取消 / 完成就釋放預覽 URL
 */
import { useEffect, useState, type ChangeEvent } from 'react';
import { uploadAsset } from '../api/endpoints';
import { errorMessage } from '../api/errorMessage';
import { prepareImage } from './imageCrop';
import type { PendingImage } from './ImagePreviewDialog';
import type { ImageSlotKind } from './imageUpload';

const release = (image: PendingImage | null) => {
    if (!image) return;
    URL.revokeObjectURL(image.sourceUrl);
    URL.revokeObjectURL(image.resultUrl);
};

/** 揀咗嘅檔 → 預覽（連 object URL）或者錯誤文字 */
const toPending = async (file: File, slot: ImageSlotKind): Promise<PendingImage | string> => {
    const prepared = await prepareImage(file, slot);
    if ('error' in prepared) return prepared.error;
    return {
        ...prepared,
        name: file.name,
        sourceUrl: URL.createObjectURL(file),
        resultUrl: URL.createObjectURL(prepared.blob),
    };
};

export const useImageUpload = (
    slot: ImageSlotKind,
    onUploaded: (name: string) => Promise<void> | void,
) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string>();
    const [pending, setPending] = useState<PendingImage | null>(null);
    useEffect(() => () => release(pending), [pending]);
    const onPick = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        setError(undefined);
        if (!file) return;
        const next = await toPending(file, slot);
        if (typeof next === 'string') setError(next);
        else setPending(next);
    };
    const confirm = async () => {
        if (!pending) return;
        setBusy(true);
        await uploadAsset(pending.blob)
            .then(({ name }) => onUploaded(name))
            .catch((uploadError: unknown) => setError(errorMessage(uploadError)));
        setPending(null);
        setBusy(false);
    };
    return { busy, error, pending, onPick, confirm, cancel: () => setPending(null) };
};

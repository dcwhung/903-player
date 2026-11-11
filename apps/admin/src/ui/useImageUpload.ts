/* 圖片 slot 上載流程：本機檢查 → PUT /api/assets → onUploaded（caller 即刻存 entry） */
import { useState, type ChangeEvent } from 'react';
import { uploadAsset } from '../api/endpoints';
import { checkImageFile, type ImageSlotKind } from './imageUpload';

export const useImageUpload = (
    slot: ImageSlotKind,
    onUploaded: (name: string) => Promise<void> | void,
) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string>();
    const onPick = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        const problem = await checkImageFile(file, slot);
        setError(problem);
        if (problem) return;
        setBusy(true);
        try {
            await onUploaded((await uploadAsset(file)).name);
        } catch (uploadError) {
            setError(uploadError instanceof Error ? uploadError.message : String(uploadError));
        } finally {
            setBusy(false);
        }
    };
    return { busy, error, onPick };
};

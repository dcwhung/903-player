/*
 * 圖片 slot 上載流程：揀檔 → 裁切 dialog（載入中 → 候選 / 拖框）→「上載」先轉 WebP + PUT /api/assets →
 * onUploaded（caller 即刻存 entry）→ 收 dialog。轉換 / 上載失敗留喺 dialog（可以再試或者取消）
 */
import { useState, type ChangeEvent } from 'react';
import { errorMessage } from '../api/errorMessage';
import type { ImageSlotKind } from './imageUpload';
import { uploadChoice } from './uploadChoice';
import { useCropSession, type ReadySource } from './useCropSession';

type OnUploaded = (name: string) => Promise<void> | void;

/** 上載 + 存 entry；回錯誤文字（成功 = undefined） */
const uploadAndSave = async (
    ready: ReadySource,
    slot: ImageSlotKind,
    onBusy: (message: string) => void,
    onUploaded: OnUploaded,
): Promise<string | undefined> => {
    const uploaded = await uploadChoice(ready, slot, onBusy);
    if ('error' in uploaded) return uploaded.error;
    try {
        await onUploaded(uploaded.name);
        return undefined;
    } catch (error) {
        return errorMessage(error);
    }
};

export const useImageUpload = (slot: ImageSlotKind, onUploaded: OnUploaded) => {
    const session = useCropSession(slot);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string>();
    const onPick = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        setError(undefined);
        if (file) void session.open(file);
    };
    const confirm = async () => {
        if (session.phase?.status !== 'ready') return;
        setError(undefined);
        const failed = await uploadAndSave(session.phase, slot, setBusy, onUploaded);
        setBusy(null);
        if (failed === undefined) session.close();
        else setError(failed);
    };
    const cancel = () => {
        setError(undefined);
        session.close();
    };
    return { session, busy, error, onPick, confirm, cancel };
};

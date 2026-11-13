/*
 * 裁切 dialog 嘅原圖狀態：揀檔 → 載入中（S-816 busy）→ 錯誤 / 可以裁（預設置中裁切）；
 * 收 dialog / 換圖 / unmount 就 close bitmap + 釋放 object URL。遲咗返嚟嘅舊載入（揀咗第二張）會被丟棄
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { centerCrop, CROP_MODE } from './cropGeometry';
import type { CropChoice } from './cropRender';
import { loadSource, type Failure, type LoadedSource } from './imageCrop';
import { SLOT_SIZES, type CropSlot } from './imageUpload';

export interface ReadySource {
    /** 原檔（首頁 Banner 第二張預設沿用同一張） */
    file: File;
    loaded: LoadedSource;
    name: string;
    sourceUrl: string;
    choice: CropChoice;
}

export type CropPhase =
    | { status: 'loading'; name: string; bytes: number }
    | { status: 'error'; name: string; message: string }
    | ({ status: 'ready' } & ReadySource);

const release = (ready: ReadySource | null) => {
    if (!ready) return;
    ready.loaded.image.close();
    URL.revokeObjectURL(ready.sourceUrl);
};

/** decode 完 → 可以裁（預設置中裁切）或者錯誤 */
const toPhase = (file: File, slot: CropSlot, result: LoadedSource | Failure): CropPhase => {
    if ('error' in result) return { status: 'error', name: file.name, message: result.error };
    return {
        status: 'ready',
        file,
        loaded: result,
        name: file.name,
        sourceUrl: URL.createObjectURL(file),
        choice: { mode: CROP_MODE.CENTER, box: centerCrop(result.source, SLOT_SIZES[slot]) },
    };
};

/** 而家 dialog 用緊嘅 bitmap + object URL：換圖 / 收 dialog / unmount 就釋放；token 認出遲咗返嚟嘅舊載入 */
const useHeldSource = () => {
    const readyRef = useRef<ReadySource | null>(null);
    const tokenRef = useRef(0);
    const drop = useCallback(() => {
        tokenRef.current += 1;
        release(readyRef.current);
        readyRef.current = null;
    }, []);
    useEffect(() => drop, [drop]);
    const token = useCallback(() => tokenRef.current, []);
    const hold = useCallback((ready: ReadySource) => {
        readyRef.current = ready;
    }, []);
    return { drop, token, hold };
};

export const useCropSession = (slot: CropSlot) => {
    const [phase, setPhase] = useState<CropPhase | null>(null);
    const { drop, token, hold } = useHeldSource();
    const open = useCallback(
        async (file: File) => {
            drop();
            const mine = token();
            setPhase({ status: 'loading', name: file.name, bytes: file.size });
            const result = await loadSource(file);
            // 揀咗第二張 / 收咗 dialog：舊嗰張遲咗返嚟就丟棄
            if (mine !== token()) {
                if (!('error' in result)) result.image.close();
                return;
            }
            const next = toPhase(file, slot, result);
            if (next.status === 'ready') hold(next);
            setPhase(next);
        },
        [drop, token, hold, slot],
    );
    const choose = useCallback(
        (choice: CropChoice) =>
            setPhase((current) => (current?.status === 'ready' ? { ...current, choice } : current)),
        [],
    );
    const close = useCallback(() => (drop(), setPhase(null)), [drop]);
    return { phase, open, choose, close };
};

export type CropSession = ReturnType<typeof useCropSession>;

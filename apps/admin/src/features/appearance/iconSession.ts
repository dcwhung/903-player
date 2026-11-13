/*
 * 更換 App 圖示嘅載入狀態（唔用 useCropSession，因為要喺載入嗰一刻就計好裁切框同抽色）：
 * 揀檔 → 載入中 → 錯誤 / 可以裁。收 dialog / 換圖 / unmount 就 close bitmap + 釋放 object URL
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { centerCrop, type CropRect } from '../../ui/cropGeometry';
import { browserEnv, loadSource, type Failure, type LoadedSource } from '../../ui/imageCrop';
import { sampleEdgeColours, swatchesOf } from './iconColours';
import { ICON_SQUARE } from './iconModel';

export interface IconReady {
    status: 'ready';
    file: File;
    loaded: LoadedSource;
    sourceUrl: string;
    box: CropRect;
    swatches: string[];
}

export type IconPhase =
    | { status: 'loading'; name: string; bytes: number }
    | { status: 'error'; name: string; message: string }
    | IconReady;

const toReady = (file: File, loaded: LoadedSource): IconReady => {
    const box = centerCrop(loaded.source, ICON_SQUARE);
    return {
        status: 'ready',
        file,
        loaded,
        sourceUrl: URL.createObjectURL(file),
        box,
        swatches: swatchesOf(sampleEdgeColours(loaded.image, box, browserEnv.createCanvas)),
    };
};

const release = (ready: IconReady | null) => {
    if (!ready) return;
    ready.loaded.image.close();
    URL.revokeObjectURL(ready.sourceUrl);
};

const toPhase = (file: File, result: LoadedSource | Failure): IconPhase =>
    'error' in result
        ? { status: 'error', name: file.name, message: result.error }
        : toReady(file, result);

/** 載入 + 釋放：遲咗返嚟（揀咗第二張）嘅舊載入會被丟棄 */
export const useIconSession = () => {
    const [phase, setPhase] = useState<IconPhase | null>(null);
    const readyRef = useRef<IconReady | null>(null);
    const tokenRef = useRef(0);
    const drop = useCallback(() => {
        tokenRef.current += 1;
        release(readyRef.current);
        readyRef.current = null;
    }, []);
    useEffect(() => drop, [drop]);
    const open = useCallback(
        async (file: File) => {
            drop();
            const mine = tokenRef.current;
            setPhase({ status: 'loading', name: file.name, bytes: file.size });
            const result = await loadSource(file);
            if (mine !== tokenRef.current) {
                if (!('error' in result)) result.image.close();
                return;
            }
            const next = toPhase(file, result);
            if (next.status === 'ready') readyRef.current = next;
            setPhase(next);
        },
        [drop],
    );
    const close = useCallback(() => (drop(), setPhase(null)), [drop]);
    return { phase, open, close };
};

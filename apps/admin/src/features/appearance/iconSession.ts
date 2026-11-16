/*
 * 更換 / 調整 App 圖示嘅載入狀態（唔用 useCropSession，因為要喺載入嗰一刻就計好裁切框同抽色）：
 * 揀檔（或者由伺服器讀返原圖，icon recrop）→ 載入中 → 錯誤 / 可以裁。
 * 收 dialog / 換圖 / unmount 就 close bitmap + 釋放 object URL
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { centerCrop, type CropRect } from '../../ui/cropGeometry';
import { browserEnv, loadSource, type Failure, type LoadedSource } from '../../ui/imageCrop';
import { sampleEdgeColours, swatchesOf } from './iconColours';
import { ICON_SQUARE, withSwatch, type IconSeed } from './iconModel';

export interface IconReady {
    status: 'ready';
    file: File;
    loaded: LoadedSource;
    sourceUrl: string;
    /** 預設（置中）裁切框；有 seed.boxes 就由嗰度開始 */
    box: CropRect;
    swatches: string[];
    seed: IconSeed;
}

/** bytes 冇 = 由伺服器讀，未知大小 */
export type IconPhase =
    | { status: 'loading'; name: string; bytes?: number }
    | { status: 'error'; name: string; message: string }
    | IconReady;

/** 開 dialog：檔名（載入中顯示）、點樣攞 File、起點 */
export interface IconOpen {
    name: string;
    bytes?: number;
    file: () => Promise<File | Failure>;
    seed: IconSeed;
}

const toReady = (file: File, loaded: LoadedSource, seed: IconSeed): IconReady => {
    const box = centerCrop(loaded.source, ICON_SQUARE);
    const extracted = swatchesOf(sampleEdgeColours(loaded.image, box, browserEnv.createCanvas));
    return {
        status: 'ready',
        file,
        loaded,
        sourceUrl: URL.createObjectURL(file),
        box,
        swatches: withSwatch(extracted, seed.background),
        seed,
    };
};

const release = (ready: IconReady | null) => {
    if (!ready) return;
    ready.loaded.image.close();
    URL.revokeObjectURL(ready.sourceUrl);
};

type Loaded = { file: File; loaded: LoadedSource } | Failure;

const loadIcon = async (
    request: IconOpen,
): Promise<{ file: File; loaded: LoadedSource } | Failure> => {
    const file = await request.file();
    if ('error' in file) return file;
    const loaded = await loadSource(file);
    return 'error' in loaded ? loaded : { file, loaded };
};

const loadingPhase = ({ name, bytes }: IconOpen): IconPhase => ({
    status: 'loading',
    name,
    ...(bytes === undefined ? {} : { bytes }),
});

const phaseOf = (request: IconOpen, result: Loaded): IconPhase =>
    'error' in result
        ? { status: 'error', name: request.name, message: result.error }
        : toReady(result.file, result.loaded, request.seed);

/** 遲咗返嚟（已經揀咗第二張 / 收咗 dialog）：丟棄 */
const discard = (result: Loaded) => {
    if (!('error' in result)) result.loaded.image.close();
};

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
    const start = useCallback(
        async (request: IconOpen) => {
            drop();
            const mine = tokenRef.current;
            setPhase(loadingPhase(request));
            const result = await loadIcon(request);
            if (mine !== tokenRef.current) return discard(result);
            const next = phaseOf(request, result);
            if (next.status === 'ready') readyRef.current = next;
            setPhase(next);
        },
        [drop],
    );
    const close = useCallback(() => (drop(), setPhase(null)), [drop]);
    return { phase, start, close };
};

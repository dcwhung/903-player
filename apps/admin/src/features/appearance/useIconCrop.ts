/*
 * 更換 / 調整 App 圖示嘅狀態（Q6）：「所有裝置使用同一裁切」= 一個框；取消勾選後 iPhone / Android / 瀏覽器分頁
 * 各自一個框。遮罩底色由邊緣抽色（+ 黑 + 白），預設第一個抽色。載入見 useIconSession。
 * 調整（icon recrop）：由原圖 + 上次嘅框 / 底色開始，撳咗邊個裝置預覽就單獨調嗰個（iconModel.initialCrop）
 * Design Origin: mockup: _mockups_/admin-appearance/index.html#b
 */
import { useState, type ChangeEvent } from 'react';
import type { CropRect } from '../../ui/cropGeometry';
import type { IconSourceRequest } from './brandingModel';
import {
    boxesFor,
    initialCrop,
    isSmallIconSource,
    type IconBoxes,
    type IconDevice,
} from './iconModel';
import { useIconSession, type IconReady } from './iconSession';
import { fetchIconSource } from './iconSourceFile';

/** 裁切框：同一裁切用 shared；各自裁切用自己調過嘅，未調過照用 shared。ready 一換就由 seed 重設 */
const useBoxes = (ready: IconReady | null) => {
    const [same, setSame] = useState(true);
    const [device, setDevice] = useState<IconDevice>('ios');
    const [shared, setShared] = useState<CropRect | null>(null);
    const [own, setOwn] = useState<Partial<IconBoxes>>({});
    const [last, setLast] = useState<IconReady | null>(null);
    if (ready !== last) {
        setLast(ready);
        const start = ready && initialCrop(ready.box, ready.seed);
        setShared(start?.shared ?? null);
        setOwn(start?.own ?? {});
        if (start) {
            setSame(start.same);
            setDevice(start.device);
        }
    }
    const boxes: IconBoxes | null = shared && boxesFor(same, shared, own);
    const activeBox = boxes ? (same ? boxes.ios : boxes[device]) : null;
    const setBox = (box: CropRect) =>
        same ? setShared(box) : setOwn((current) => ({ ...current, [device]: box }));
    return { same, setSame, device, setDevice, boxes, activeBox, setBox };
};

/** 遮罩底色：上次嘅底色；新檔預設揀第一個抽色 */
const useBackground = (ready: IconReady | null) => {
    const [background, setBackground] = useState<string | null>(null);
    const [last, setLast] = useState<IconReady | null>(null);
    if (ready !== last) {
        setLast(ready);
        setBackground(ready?.seed.background ?? ready?.swatches[0] ?? null);
    }
    return { background: background ?? '#000000', setBackground };
};

/** 開 dialog：揀新檔（更換）或者由預覽調整（讀返原圖） */
const useIconOpen = (
    session: ReturnType<typeof useIconSession>,
    setError: (error: string | undefined) => void,
) => {
    /** true = 由預覽調整（標題「調整 App 圖示」）；false = 更換（揀新檔） */
    const [adjusting, setAdjusting] = useState(false);
    const onPick = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        setError(undefined);
        if (!file) return;
        setAdjusting(false);
        // 本機揀咗嘅檔（更換）：新原圖，預設置中裁切、同一裁切
        void session.start({ name: file.name, bytes: file.size, file: async () => file, seed: {} });
    };
    const adjust = ({ url, name, seed }: IconSourceRequest) => {
        setError(undefined);
        setAdjusting(true);
        void session.start({ name, file: () => fetchIconSource(url, name), seed });
    };
    return { onPick, adjust, adjusting };
};

export const useIconCrop = () => {
    const session = useIconSession();
    const ready = session.phase?.status === 'ready' ? session.phase : null;
    const boxes = useBoxes(ready);
    const colour = useBackground(ready);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string>();
    const opener = useIconOpen(session, setError);
    return {
        session,
        ready,
        ...boxes,
        ...colour,
        swatches: ready?.swatches ?? [],
        small: ready ? isSmallIconSource(ready.loaded.source) : false,
        busy,
        setBusy,
        error,
        setError,
        ...opener,
    };
};

export type IconCrop = ReturnType<typeof useIconCrop>;

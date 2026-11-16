/*
 * 更換 App 圖示嘅狀態（Q6）：「所有裝置使用同一裁切」= 一個框；取消勾選後 iPhone / Android / 瀏覽器分頁
 * 各自一個框。遮罩底色由邊緣抽色（+ 黑 + 白），預設第一個抽色。載入見 useIconSession
 * Design Origin: mockup: _mockups_/admin-appearance/index.html#b
 */
import { useState, type ChangeEvent } from 'react';
import type { CropRect } from '../../ui/cropGeometry';
import { boxesFor, isSmallIconSource, type IconBoxes, type IconDevice } from './iconModel';
import { useIconSession, type IconReady } from './iconSession';

/** 裁切框：同一裁切用 shared；各自裁切用自己調過嘅，未調過照用 shared。ready 一換就重設 */
const useBoxes = (ready: IconReady | null) => {
    const [same, setSame] = useState(true);
    const [device, setDevice] = useState<IconDevice>('ios');
    const [shared, setShared] = useState<CropRect | null>(null);
    const [own, setOwn] = useState<Partial<IconBoxes>>({});
    const [last, setLast] = useState<IconReady | null>(null);
    if (ready !== last) {
        setLast(ready);
        setShared(ready?.box ?? null);
        setOwn({});
    }
    const boxes: IconBoxes | null = shared && boxesFor(same, shared, own);
    const activeBox = boxes ? (same ? boxes.ios : boxes[device]) : null;
    const setBox = (box: CropRect) =>
        same ? setShared(box) : setOwn((current) => ({ ...current, [device]: box }));
    return { same, setSame, device, setDevice, boxes, activeBox, setBox };
};

/** 遮罩底色：新載入預設揀第一個抽色 */
const useBackground = (ready: IconReady | null) => {
    const [background, setBackground] = useState<string | null>(null);
    const [last, setLast] = useState<IconReady | null>(null);
    if (ready !== last) {
        setLast(ready);
        setBackground(ready?.swatches[0] ?? null);
    }
    return { background: background ?? '#000000', setBackground };
};

export const useIconCrop = () => {
    const session = useIconSession();
    const ready = session.phase?.status === 'ready' ? session.phase : null;
    const boxes = useBoxes(ready);
    const colour = useBackground(ready);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string>();
    const onPick = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        setError(undefined);
        if (file) void session.open(file);
    };
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
        onPick,
    };
};

export type IconCrop = ReturnType<typeof useIconCrop>;

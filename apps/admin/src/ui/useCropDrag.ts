/*
 * 裁切框拖曳 / 鍵盤：拖框移位、拖右下角縮放（鎖比例、限喺原圖入面，cropGeometry）；
 * focus 咗裁切框用方向鍵移位、+ / − 縮放。fit 兩款（locked）乜都唔郁。
 * onDragChange：撳落 / 放手時通知（候選縮圖拖緊唔重畫，放手先畫，S-910）
 */
import { useState, type KeyboardEvent, type PointerEvent } from 'react';
import { CROP_MODE, moveBox, resizeBox, type CropRect, type DragDelta } from './cropGeometry';
import type { CropChoice } from './cropRender';
import { SLOT_SIZES, type CropSlot, type Size } from './imageUpload';
import type { ReadySource } from './useCropSession';

type DragKind = 'move' | 'resize';

interface Drag {
    kind: DragKind;
    x: number;
    y: number;
    box: CropRect;
}

/** 方向鍵一下移原圖長邊嘅 1/50 */
const KEY_STEP_FRACTION = 0.02;
const ARROWS: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
};
const GROW_KEYS: Record<string, number> = { '+': 1, '=': 1, '-': -1 };

const nextBox = (kind: DragKind, box: CropRect, delta: DragDelta, source: Size, target: Size) =>
    kind === 'move' ? moveBox(box, delta, source) : resizeBox(box, delta, source, target);

/** 方向鍵 = 移位、+ / − = 縮放；其他鍵 null */
const keyAction = (key: string, source: Size): { kind: DragKind; delta: DragDelta } | null => {
    const step = Math.max(source.width, source.height) * KEY_STEP_FRACTION;
    const arrow = ARROWS[key];
    if (arrow) return { kind: 'move', delta: { dx: arrow[0] * step, dy: arrow[1] * step } };
    const grow = GROW_KEYS[key];
    return grow ? { kind: 'resize', delta: { dx: grow * step, dy: 0 } } : null;
};

/** 指標移咗幾多（螢幕 px → 原圖 px） */
const dragDelta = (event: PointerEvent, from: Drag, shownWidth: number, source: Size) => {
    const scale = source.width / shownWidth;
    return { dx: (event.clientX - from.x) * scale, dy: (event.clientY - from.y) * scale };
};

interface DragContext {
    drag: Drag | null;
    setDrag: (drag: Drag | null) => void;
    locked: boolean;
    source: Size;
    box: CropRect;
    apply: (kind: DragKind, box: CropRect, delta: DragDelta) => void;
}

/** 裁切框（move）/ 右下角（resize）嘅 pointer handler：撳落記住起點同當時個框，拖嘅時候由起點計 */
const pointerHandlers = (context: DragContext, kind: DragKind) => {
    const { drag, setDrag, locked, source, box, apply } = context;
    const stop = () => setDrag(null);
    return {
        onPointerDown: (event: PointerEvent<HTMLElement>) => {
            if (locked) return;
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.setPointerCapture?.(event.pointerId);
            setDrag({ kind, x: event.clientX, y: event.clientY, box });
        },
        onPointerMove: (event: PointerEvent<HTMLElement>) => {
            // 原圖顯示咗幾闊（螢幕 px）：同一個 .src 入面嗰張 img
            const image = event.currentTarget.closest('.src')?.querySelector('img');
            const width = image?.getBoundingClientRect().width;
            if (drag && width) apply(drag.kind, drag.box, dragDelta(event, drag, width, source));
        },
        onPointerUp: stop,
        onPointerCancel: stop,
    };
};

const keyHandler =
    ({ locked, source, box, apply }: DragContext) =>
    (event: KeyboardEvent) => {
        const action = locked ? null : keyAction(event.key, source);
        if (!action) return;
        event.preventDefault();
        apply(action.kind, box, action.delta);
    };

export const useCropDrag = (
    ready: ReadySource,
    slot: CropSlot,
    locked: boolean,
    onChoice: (choice: CropChoice) => void,
    onDragChange?: (dragging: boolean) => void,
) => {
    const [drag, setDragState] = useState<Drag | null>(null);
    const setDrag = (next: Drag | null) => {
        setDragState(next);
        onDragChange?.(next !== null);
    };
    const { source } = ready.loaded;
    const apply = (kind: DragKind, box: CropRect, delta: DragDelta) =>
        onChoice({
            mode: CROP_MODE.CENTER,
            box: nextBox(kind, box, delta, source, SLOT_SIZES[slot]),
        });
    const context = { drag, setDrag, locked, source, box: ready.choice.box, apply };
    return {
        boxHandlers: { ...pointerHandlers(context, 'move'), onKeyDown: keyHandler(context) },
        gripHandlers: pointerHandlers(context, 'resize'),
    };
};

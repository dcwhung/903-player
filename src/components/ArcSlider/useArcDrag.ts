import { useRef, useState, type PointerEvent } from 'react';
import { isOnArcBand, pointToRatio, stabiliseDragRatio, type Point } from '../../utils/arc';
import { ARC_HIT_BAND, CENTER, VIEWBOX_SIZE } from './ArcSlider.constants';

type SvgPointerEvent = PointerEvent<SVGSVGElement>;

const viewBoxPoint = (event: SvgPointerEvent): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
        x: ((event.clientX - rect.left) / rect.width) * VIEWBOX_SIZE,
        y: ((event.clientY - rect.top) / rect.height) * VIEWBOX_SIZE,
    };
};

const ratioFromPointer = (event: SvgPointerEvent): number => {
    const { x, y } = viewBoxPoint(event);
    return pointToRatio(x, y, CENTER);
};

const isOnBand = (event: SvgPointerEvent): boolean => {
    const { x, y } = viewBoxPoint(event);
    return isOnArcBand(x, y, CENTER, ARC_HIT_BAND);
};

/** 拖緊嗰隻手指（owner）先截住；未開始拖嘅 move / up 要照傳，卡疊先確認到橫拖 */
const claim = (event: SvgPointerEvent, owner: number | null): boolean => {
    if (event.pointerId !== owner) return false;
    event.stopPropagation();
    return true;
};

/** 撳落：撳中圓環就截住（即使開始唔到）；開始到就 capture，返回起手 ratio，否則 null */
const pressBand = (event: SvgPointerEvent, canStart: boolean): number | null => {
    if (!isOnBand(event)) return null;
    event.stopPropagation();
    if (!canStart) return null;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    return ratioFromPointer(event);
};

type ArcPreviewListener = (seconds: number | null, cancelled: boolean) => void;

/** 拖動中嘅預覽值同拖緊嗰隻手指：start 開始拖；preview(null) = 拖完（放手或取消），owner 一齊清 */
const useArcPreview = (max: number, onPreview?: ArcPreviewListener) => {
    const [dragRatio, setDragRatio] = useState<number | null>(null);
    // 邊隻手指拖緊（null = 冇拖）：其他手指嘅 events 唔理，唔可以搶走或者結束呢次拖動
    const ownerRef = useRef<number | null>(null);
    const preview = (ratio: number | null, cancelled = false) => {
        if (ratio === null) ownerRef.current = null;
        setDragRatio(ratio);
        onPreview?.(ratio === null ? null : ratio * max, cancelled);
    };
    const start = (pointerId: number, ratio: number) => {
        ownerRef.current = pointerId;
        preview(ratio);
    };
    return { dragRatio, ownerRef, preview, start };
};

/**
 * 拖動弧形：拖緊只預覽，放手先 seek；取消手勢唔 seek。
 * 只有撳中圓環先當自己嘅手勢（stopPropagation，唔郁今日節目卡疊 / mini player）；
 * 圓環以外照傳上去，等卡疊 swipe 得到。locked（例如捽緊碟）或者已經有手指拖緊就唔開始新手勢，但照截住
 */
export const useArcDrag = (
    max: number,
    onSeek: (seconds: number) => void,
    onPreview?: ArcPreviewListener,
    locked = false,
) => {
    const { dragRatio, ownerRef, preview, start } = useArcPreview(max, onPreview);
    const nextRatio = (event: SvgPointerEvent) =>
        stabiliseDragRatio(ratioFromPointer(event), dragRatio);
    const handlers = {
        onPointerDown: (event: SvgPointerEvent) => {
            const ratio = pressBand(event, max > 0 && !locked && ownerRef.current === null);
            if (ratio !== null) start(event.pointerId, ratio);
        },
        onPointerMove: (event: SvgPointerEvent) => {
            if (claim(event, ownerRef.current)) preview(nextRatio(event));
        },
        onPointerUp: (event: SvgPointerEvent) => {
            if (!claim(event, ownerRef.current)) return;
            onSeek(nextRatio(event) * max);
            preview(null);
        },
        onPointerCancel: (event: SvgPointerEvent) => {
            if (claim(event, ownerRef.current)) preview(null, true);
        },
    };
    return { dragRatio, handlers };
};

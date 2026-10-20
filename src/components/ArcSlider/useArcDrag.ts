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

/**
 * 拖動弧形：拖緊只預覽，放手先 seek；取消手勢唔 seek。
 * 只有撳中圓環先當自己嘅手勢（stopPropagation，唔郁今日節目卡疊 / mini player）；
 * 圓環以外照傳上去，等卡疊 swipe 得到。locked（例如捽緊碟）或者已經有手指拖緊就唔開始新手勢，但照截住
 */
export const useArcDrag = (
    max: number,
    onSeek: (seconds: number) => void,
    onPreview?: (seconds: number | null) => void,
    locked = false,
) => {
    const [dragRatio, setDragRatio] = useState<number | null>(null);
    // 邊隻手指拖緊（null = 冇拖）：其他手指嘅 events 唔理，唔可以搶走或者結束呢次拖動
    const owner = useRef<number | null>(null);
    const preview = (ratio: number | null) => {
        if (ratio === null) owner.current = null;
        setDragRatio(ratio);
        onPreview?.(ratio === null ? null : ratio * max);
    };
    const nextRatio = (event: SvgPointerEvent) =>
        stabiliseDragRatio(ratioFromPointer(event), dragRatio);
    // 拖緊嗰隻手指先截住；未開始拖嘅 move / up 要照傳，卡疊先確認到橫拖
    const claim = (event: SvgPointerEvent): boolean => {
        if (event.pointerId !== owner.current) return false;
        event.stopPropagation();
        return true;
    };
    const handlers = {
        onPointerDown: (event: SvgPointerEvent) => {
            if (!isOnBand(event)) return;
            event.stopPropagation();
            if (max <= 0 || locked || owner.current !== null) return;
            owner.current = event.pointerId;
            event.currentTarget.setPointerCapture?.(event.pointerId);
            preview(ratioFromPointer(event));
        },
        onPointerMove: (event: SvgPointerEvent) => {
            if (claim(event)) preview(nextRatio(event));
        },
        onPointerUp: (event: SvgPointerEvent) => {
            if (!claim(event)) return;
            onSeek(nextRatio(event) * max);
            preview(null);
        },
        onPointerCancel: (event: SvgPointerEvent) => {
            if (claim(event)) preview(null);
        },
    };
    return { dragRatio, handlers };
};

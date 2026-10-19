import { useState, type PointerEvent } from 'react';
import { pointToRatio, stabiliseDragRatio } from '../../utils/arc';
import { CENTER, VIEWBOX_SIZE } from './ArcSlider.constants';

type SvgPointerEvent = PointerEvent<SVGSVGElement>;

const ratioFromPointer = (event: SvgPointerEvent): number => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * VIEWBOX_SIZE;
    const y = ((event.clientY - rect.top) / rect.height) * VIEWBOX_SIZE;
    return pointToRatio(x, y, CENTER);
};

/** 拖弧形唔好傳上去 carousel / mini player 嘅 swipe：先 stopPropagation 再處理 */
const contained =
    (handler: (event: SvgPointerEvent) => void) =>
    (event: SvgPointerEvent): void => {
        event.stopPropagation();
        handler(event);
    };

/** 拖動弧形：拖緊只預覽，放手先 seek；取消手勢唔 seek */
export const useArcDrag = (
    max: number,
    onSeek: (seconds: number) => void,
    onPreview?: (seconds: number | null) => void,
) => {
    const [dragRatio, setDragRatio] = useState<number | null>(null);
    const preview = (ratio: number | null) => {
        setDragRatio(ratio);
        onPreview?.(ratio === null ? null : ratio * max);
    };
    const nextRatio = (event: SvgPointerEvent) =>
        stabiliseDragRatio(ratioFromPointer(event), dragRatio);
    const handlers = {
        onPointerDown: contained((event) => {
            if (max <= 0) return;
            event.currentTarget.setPointerCapture?.(event.pointerId);
            preview(ratioFromPointer(event));
        }),
        onPointerMove: contained((event) => {
            if (dragRatio !== null) preview(nextRatio(event));
        }),
        onPointerUp: contained((event) => {
            if (dragRatio === null) return;
            onSeek(nextRatio(event) * max);
            preview(null);
        }),
        onPointerCancel: contained(() => preview(null)),
    };
    return { dragRatio, handlers };
};

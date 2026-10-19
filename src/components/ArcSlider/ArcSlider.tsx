import { useState, type KeyboardEvent, type PointerEvent } from 'react';
import { ARC_START_DEGREES, KEYBOARD_SEEK_SECONDS } from '../../config/constants';
import { arcDashArray, pointToRatio, ratioToPoint } from '../../utils/arc';
import styles from './ArcSlider.module.css';

interface ArcSliderProps {
    value: number;
    max: number;
    onSeek: (seconds: number) => void;
    label: string;
    formatValueText: (seconds: number) => string;
    /** 拖動時通知父 component 預覽值（放手時 null） */
    onPreview?: (seconds: number | null) => void;
}

const VIEWBOX_SIZE = 300;
const CENTER = VIEWBOX_SIZE / 2;
const RADIUS = 140;
const STROKE_WIDTH = 6;
const THUMB_RADIUS = 9;

const ratioFromPointer = (event: PointerEvent<SVGSVGElement>): number => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * VIEWBOX_SIZE;
    const y = ((event.clientY - rect.top) / rect.height) * VIEWBOX_SIZE;
    return pointToRatio(x, y, CENTER);
};

const keyTarget = (key: string, value: number, max: number): number | null => {
    const targets: Record<string, number> = {
        ArrowRight: value + KEYBOARD_SEEK_SECONDS,
        ArrowUp: value + KEYBOARD_SEEK_SECONDS,
        ArrowLeft: value - KEYBOARD_SEEK_SECONDS,
        ArrowDown: value - KEYBOARD_SEEK_SECONDS,
        Home: 0,
        End: max,
    };
    return targets[key] ?? null;
};

const useArcDrag = (
    max: number,
    onSeek: (s: number) => void,
    onPreview?: (s: number | null) => void,
) => {
    const [dragRatio, setDragRatio] = useState<number | null>(null);
    const preview = (ratio: number | null) => {
        setDragRatio(ratio);
        onPreview?.(ratio === null ? null : ratio * max);
    };
    return {
        dragRatio,
        onPointerDown: (event: PointerEvent<SVGSVGElement>) => {
            if (max <= 0) return;
            event.currentTarget.setPointerCapture?.(event.pointerId);
            preview(ratioFromPointer(event));
        },
        onPointerMove: (event: PointerEvent<SVGSVGElement>) => {
            if (dragRatio !== null) preview(ratioFromPointer(event));
        },
        onPointerUp: (event: PointerEvent<SVGSVGElement>) => {
            if (dragRatio === null) return;
            onSeek(ratioFromPointer(event) * max);
            preview(null);
        },
    };
};

/** 270° 弧形進度條，可以拖動、撳或者用方向鍵調整 */
export const ArcSlider = ({
    value,
    max,
    onSeek,
    label,
    formatValueText,
    onPreview,
}: ArcSliderProps) => {
    const { dragRatio, ...pointerHandlers } = useArcDrag(max, onSeek, onPreview);
    const ratio = dragRatio ?? (max > 0 ? value / max : 0);
    const shownValue = ratio * max;
    const thumb = ratioToPoint(ratio, CENTER, RADIUS);
    const rotate = `rotate(${ARC_START_DEGREES} ${CENTER} ${CENTER})`;

    const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
        const target = keyTarget(event.key, value, max);
        if (target === null) return;
        event.preventDefault();
        onSeek(target);
    };

    return (
        <svg
            className={styles.slider}
            viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
            role="slider"
            tabIndex={0}
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={Math.round(max)}
            aria-valuenow={Math.round(shownValue)}
            aria-valuetext={formatValueText(shownValue)}
            onKeyDown={onKeyDown}
            onPointerCancel={pointerHandlers.onPointerUp}
            {...pointerHandlers}
        >
            <circle
                className={styles.track}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={arcDashArray(1, RADIUS)}
                transform={rotate}
            />
            <circle
                className={styles.progress}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={arcDashArray(ratio, RADIUS)}
                transform={rotate}
            />
            <circle className={styles.thumb} cx={thumb.x} cy={thumb.y} r={THUMB_RADIUS} />
        </svg>
    );
};

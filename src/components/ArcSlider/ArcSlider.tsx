import type { KeyboardEvent } from 'react';
import { KEYBOARD_SEEK_SECONDS } from '../../config/constants';
import { VIEWBOX_SIZE } from './ArcSlider.constants';
import styles from './ArcSlider.module.css';
import { ArcTrack } from './ArcTrack';
import { useArcDrag } from './useArcDrag';

interface ArcSliderProps {
    value: number;
    max: number;
    onSeek: (seconds: number) => void;
    label: string;
    formatValueText: (seconds: number) => string;
    /** 拖動時通知父 component 預覽值（放手時 null） */
    onPreview?: (seconds: number | null) => void;
    /** 其他手勢（捽碟）進行緊：唔開始新嘅拖動 */
    locked?: boolean;
}

const keyTarget = (key: string, value: number, max: number): number | undefined =>
    ({
        ArrowRight: value + KEYBOARD_SEEK_SECONDS,
        ArrowUp: value + KEYBOARD_SEEK_SECONDS,
        ArrowLeft: value - KEYBOARD_SEEK_SECONDS,
        ArrowDown: value - KEYBOARD_SEEK_SECONDS,
        Home: 0,
        End: max,
    })[key];

/** 270° 弧形進度條，可以拖動、撳或者用方向鍵調整 */
export const ArcSlider = (props: ArcSliderProps) => {
    const { value, max, onSeek, label, formatValueText, onPreview, locked } = props;
    const { dragRatio, handlers } = useArcDrag(max, onSeek, onPreview, locked);
    const ratio = dragRatio ?? (max > 0 ? value / max : 0);
    const shownValue = ratio * max;

    const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
        // 未知長度時唔處理，避免 End / 方向鍵將續播位置 seek 走
        const target = max > 0 ? keyTarget(event.key, value, max) : undefined;
        if (target === undefined) return;
        event.preventDefault();
        event.stopPropagation();
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
            {...handlers}
        >
            <ArcTrack ratio={ratio} />
        </svg>
    );
};

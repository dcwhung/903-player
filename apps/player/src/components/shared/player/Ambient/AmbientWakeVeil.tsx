import { useRef, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useLeaveFallback } from '../PlayerHandle/useLeaveFallback';
import styles from './Ambient.module.css';
import { NIGHT_PALETTE_STYLE } from './ambientNightPalette';

/** 淡出時長 token（.veil 動畫用同一個） */
const WAKE_FADE_VAR = '--ambient-wake-fade';

interface AmbientWakeVeilProps {
    /** 叫醒嗰刻嘅暗度（0–1）：遮罩由呢度淡出 */
    from: number;
    onDone: () => void;
}

/**
 * 9c 叫醒遮罩：暗咗嘅閒置畫面收起後，頁面上面一層夜間底色 3 秒淡出（--ambient-wake-fade）。
 * pointer-events: none，頁面即刻用得；純裝飾（aria-hidden）。動畫畀人取消 / 冇開始都靠 useLeaveFallback 拆走
 */
export const AmbientWakeVeil = ({ from, onDone }: AmbientWakeVeilProps) => {
    const ref = useRef<HTMLDivElement | null>(null);
    useLeaveFallback(ref, true, onDone, WAKE_FADE_VAR);
    const style = { ...NIGHT_PALETTE_STYLE, '--ambient-veil-from': String(from) } as CSSProperties;
    return createPortal(
        <div
            ref={ref}
            className={`${styles.nightPalette} ${styles.veil}`}
            data-ambient-veil=""
            aria-hidden="true"
            style={style}
            onAnimationEnd={onDone}
        />,
        document.body,
    );
};

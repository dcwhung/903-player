import type { CSSProperties } from 'react';
import { MARQUEE_GAP_PX, marqueeDistancePx, marqueeDurationMs } from './marquee';
import styles from './Marquee.module.css';
import { useOverflow } from './useOverflow';

interface MarqueeProps {
    text: string;
    /** 字款（字體大小、顏色）由用家決定 */
    className?: string;
}

/**
 * 單行文字：放得落就靜止；放唔落就由右向左慢慢捲，捲出左邊嗰陣後面一份副本由右邊接上（無縫循環）。
 * 副本 aria-hidden，讀屏只讀一次；減少動畫就唔捲，改為 …
 */
export const Marquee = ({ text, className = '' }: MarqueeProps) => {
    const { boxRef, textRef, textWidthPx, overflowPx } = useOverflow(text);
    const overflowing = overflowPx > 0;
    const distancePx = marqueeDistancePx(textWidthPx);
    const style = overflowing
        ? ({
              '--marquee-gap': `${MARQUEE_GAP_PX}px`,
              '--marquee-shift': `-${distancePx}px`,
              '--marquee-duration': `${marqueeDurationMs(distancePx)}ms`,
          } as CSSProperties)
        : undefined;
    return (
        <span
            ref={boxRef}
            className={`${styles.box} ${className}`}
            data-overflow={overflowing || undefined}
        >
            <span className={styles.track} style={style}>
                <span ref={textRef} className={styles.text}>
                    {text}
                </span>
                {overflowing && (
                    <span className={`${styles.text} ${styles.copy}`} aria-hidden="true">
                        {text}
                    </span>
                )}
            </span>
        </span>
    );
};

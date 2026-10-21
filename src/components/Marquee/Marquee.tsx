import type { CSSProperties } from 'react';
import { marqueeDurationMs } from './marquee';
import styles from './Marquee.module.css';
import { useOverflow } from './useOverflow';

interface MarqueeProps {
    text: string;
    /** 字款（字體大小、顏色）由用家決定 */
    className?: string;
}

/** 單行文字：放得落就靜止；放唔落就來回捲（減少動畫就改為 …） */
export const Marquee = ({ text, className = '' }: MarqueeProps) => {
    const { boxRef, overflowPx } = useOverflow(text);
    const overflowing = overflowPx > 0;
    const style = overflowing
        ? ({
              '--marquee-shift': `-${overflowPx}px`,
              '--marquee-duration': `${marqueeDurationMs(overflowPx)}ms`,
          } as CSSProperties)
        : undefined;
    return (
        <span
            ref={boxRef}
            className={`${styles.box} ${className}`}
            data-overflow={overflowing || undefined}
        >
            <span className={styles.track} style={style}>
                {text}
            </span>
        </span>
    );
};

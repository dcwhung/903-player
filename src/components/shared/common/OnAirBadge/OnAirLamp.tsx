import styles from './OnAirBadge.module.css';

/** live = 播緊（紅、慢慢發光）；idle = 揀中但暫停 / 未開始（灰、靜止） */
export type OnAirLampState = 'live' | 'idle';

interface OnAirLampProps {
    state: OnAirLampState;
    className?: string;
}

/**
 * 揀中 / 播緊嗰行左邊 3px 條（上下各留 18%）：純裝飾，狀態由行掣讀屏名講。
 * 用佢嘅行要 position: relative，左邊自己留位
 */
export const OnAirLamp = ({ state, className = '' }: OnAirLampProps) => (
    <span className={`${styles.lamp} ${className}`} data-on-air-lamp={state} aria-hidden="true" />
);

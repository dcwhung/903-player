import styles from './SleepTimer.module.css';

interface SleepTimerBarProps {
    /** page = 頁頂全闊（內頁 / 闊版主頁）；card = mini player 卡頂邊（跟卡圓角裁切） */
    kind: 'page' | 'card';
    /** 剩餘比例 1 → 0 */
    fraction: number;
}

/**
 * timer 進度細條（9d）：長度 = 剩餘比例，強調色；軌道淡色。每秒跳一格，唔加過場動畫。
 * 純睇嘅（aria-hidden）：剩餘時間月亮掣個名已經讀
 */
export const SleepTimerBar = ({ kind, fraction }: SleepTimerBarProps) => (
    <div
        className={styles.bar}
        data-sleep-timer-bar={kind}
        data-testid="sleep-timer-bar"
        aria-hidden="true"
    >
        <div className={styles.barFill} style={{ transform: `scaleX(${fraction})` }} />
    </div>
);

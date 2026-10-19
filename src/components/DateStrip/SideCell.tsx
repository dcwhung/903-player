import type { SwipeDirection } from '../../hooks/swipe';
import { sideCellLabel, sideCellText } from './dateStrip';
import styles from './DateStrip.module.css';

interface SideCellProps {
    /** previous = 左邊新一集，next = 右邊舊一集 */
    direction: SwipeDirection;
    /** 隔籬集日期；去到盡頭冇就留空格 */
    date: string | undefined;
    onPick: (direction: SwipeDirection) => void;
}

/** 日子條兩邊：隔籬集嘅日期，撳落去都轉集 */
export const SideCell = ({ direction, date, onPick }: SideCellProps) => {
    const placement = direction === 'next' ? styles.older : styles.newer;
    if (date === undefined) {
        return <span className={`${styles.cell} ${placement}`} aria-hidden="true" />;
    }
    return (
        <button
            type="button"
            className={`${styles.cell} ${styles.side} ${placement}`}
            aria-label={sideCellLabel(direction, date)}
            onClick={() => onPick(direction)}
        >
            {sideCellText(direction, date)}
        </button>
    );
};

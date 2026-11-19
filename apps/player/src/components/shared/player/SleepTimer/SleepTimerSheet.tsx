import { useId, type SyntheticEvent } from 'react';
import { SheetOverlay } from '../../common/Sheet/SheetOverlay';
import motion from '../../common/Sheet/SheetMotion.module.css';
import { useSheetBehaviour } from '../../common/Sheet/useSheetBehaviour';
import { useSheetPresence } from '../../common/Sheet/useSheetPresence';
import { SleepTimerMenu } from './SleepTimerMenu';
import styles from './SleepTimerSheet.module.css';

const stop = (event: SyntheticEvent) => event.stopPropagation();

/**
 * 選單係 portal（掛喺 ThemeScope 嘅 DOM），但 React 事件照沿 component 樹向上傳：
 * 唔截住，喺表入面拉 / 撳會去到 mini player / 播放卡嘅左右掃、長按手勢。
 * 鍵盤唔截：Escape / Tab 困喺表入面靠 document keydown（useSheetBehaviour）
 */
const STOP_BUBBLING = {
    onPointerDown: stop,
    onPointerMove: stop,
    onPointerUp: stop,
    onPointerCancel: stop,
    onClick: stop,
    onContextMenu: stop,
};

interface SleepTimerSheetProps {
    open: boolean;
    onClose: () => void;
    /** 闊版主頁播放卡：表蓋喺卡嗰欄（右邊），唔係成個畫面底 */
    side: boolean;
}

/**
 * 睡眠 timer 底部選單（9d）：用返現有 sheet（useSheetPresence 彈出 / 收埋、useSheetBehaviour
 * focus trap + Escape + 向下拉閂 + 閂咗焦點返月亮掣），遮罩撳就閂
 */
export const SleepTimerSheet = ({ open, onClose, side }: SleepTimerSheetProps) => {
    const titleId = useId();
    const { setSheet, backdropRef, handlers } = useSheetBehaviour(open, onClose);
    const { mounted, state, inert, overlayRef } = useSheetPresence(open);
    if (!mounted) return null;
    const backdrop = {
        className: styles.backdrop,
        testId: 'sleep-timer-backdrop',
        onClick: onClose,
    };
    return (
        <div className={styles.portal} {...STOP_BUBBLING}>
            <SheetOverlay
                {...{ state, inert, overlayRef, backdropRef, backdrop }}
                className={styles.overlay ?? ''}
                data={{ 'data-side': String(side) }}
            >
                <section
                    ref={setSheet}
                    className={`${styles.sheet} ${motion.sheet}`}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    tabIndex={-1}
                    {...handlers}
                >
                    <span className={styles.grab} aria-hidden="true" />
                    <SleepTimerMenu titleId={titleId} onDone={onClose} />
                </section>
            </SheetOverlay>
        </div>
    );
};

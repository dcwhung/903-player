import { createPortal } from 'react-dom';
import type { SwipeDirection } from '../../hooks/swipe';
import { stepIndex } from '../../hooks/useSwipe';
import { useViewportGap } from '../../hooks/useViewportGap';
import { ThemeScope } from '../ThemeScope/ThemeScope';
import { DismissButton } from './DismissButton';
import { dismissData, offsetStyle } from './dismissView';
import styles from './MiniPlayer.module.css';
import { MiniPlayerCard } from './MiniPlayerCard';
import { miniPlayerMode } from './miniPlayerMode';
import type { MiniPlayerProps } from './miniPlayerTypes';
import { useDismissGesture } from './useDismissGesture';

export type { MiniPlayerProps } from './miniPlayerTypes';

/** 左右掃轉節目：掃過頭會循環返另一頭；得一個節目就唔郁 */
const stepShow =
    (index: number, total: number, onChange: (index: number) => void) =>
    (direction: SwipeDirection) => {
        const next = stepIndex(index, total, direction, { wrap: true });
        if (next !== index) onChange(next);
    };

/**
 * 主頁底部播放器（今日節目，或者載入緊嘅廣播劇）：跟節目轉色，左右掃轉節目，撳入節目頁 / 廣播劇頁。
 * 用 portal 掛喺 body：頁面 .scope 係 size container（會變成 position: fixed 嘅 containing block），
 * 掛喺 body 先保證係跟 viewport 定位，唔受頁面 .scope / #root 影響
 */
export const MiniPlayer = ({ region, ...props }: MiniPlayerProps) => {
    useViewportGap();
    const { view, handlers, bindContainer, dismiss } = useDismissGesture(
        stepShow(props.index, props.labels.length, props.onChange),
        props.onDismiss,
    );

    // 得一段錄音：冇指示點，連個 wrapper 都唔畫，CSS 唔留指示點個位（data-mode）
    const mode = miniPlayerMode(props.keys);
    return createPortal(
        <ThemeScope theme={props.theme} fullPage={false} className={styles.wrapper}>
            <div ref={bindContainer} className={styles.slot} style={offsetStyle(view)}>
                <section
                    className={styles.player}
                    aria-label={region}
                    data-mode={mode}
                    {...dismissData(view)}
                    {...handlers}
                >
                    <MiniPlayerCard {...props} mode={mode} armed={view.armed} />
                </section>
                <DismissButton onDismiss={dismiss} />
            </div>
        </ThemeScope>,
        document.body,
    );
};

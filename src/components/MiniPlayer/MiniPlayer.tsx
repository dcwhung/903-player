import { createPortal } from 'react-dom';
import type { ShowTheme } from '../../config/showThemes';
import type { SwipeDirection } from '../../hooks/swipe';
import { stepIndex } from '../../hooks/useSwipe';
import { useViewportGap } from '../../hooks/useViewportGap';
import type { MiniPlayerTag } from '../../selectors/miniPlayer';
import { ThemeScope } from '../ThemeScope/ThemeScope';
import { DismissButton } from './DismissButton';
import { dismissData, offsetStyle } from './dismissView';
import styles from './MiniPlayer.module.css';
import { MiniPlayerCard } from './MiniPlayerCard';
import { miniPlayerMode } from './miniPlayerMode';
import { useDismissGesture } from './useDismissGesture';

export interface MiniPlayerProps {
    showName: string;
    /** 成個播放器嘅讀屏名：今日節目 / 廣播劇 */
    region: string;
    /** 開頁掣嘅讀屏名：節目頁 / 廣播劇頁 */
    openLabel: string;
    theme: ShowTheme;
    subtitle: string;
    /** 例如「12:40 / 1:58:30」；未知長度時冇 */
    timeText?: string;
    isPlaying: boolean;
    /** 真正出緊聲（唔係載緊 / 斷流）：細碟先自轉，同大碟一樣 */
    isAudible: boolean;
    /** 未知時長：細碟擺正，同大碟一樣 */
    upright: boolean;
    /** 0–1 */
    progress: number;
    /** 今日所有節目名（按播出次序） */
    labels: string[];
    /** 同 labels 一樣次序嘅錄音 URL */
    keys: string[];
    index: number;
    /** 同 labels 一樣次序嘅標籤（重溫 / 今日）；冇就唔顯示 */
    tags?: readonly (MiniPlayerTag | undefined)[];
    /** 指示點成組嘅讀屏名；預設係「今日第幾個節目」 */
    positionLabel?: (index: number, total: number) => string;
    onToggle: () => void;
    onOpen: () => void;
    onChange: (index: number) => void;
    /** 長按後左滑關閉（或者讀屏「關閉播放器」掣）：停播 + 收起 */
    onDismiss: () => void;
}

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

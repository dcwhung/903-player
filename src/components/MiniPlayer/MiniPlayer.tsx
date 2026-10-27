import { createPortal } from 'react-dom';
import type { ShowTheme } from '../../config/showThemes';
import { stepIndex, useSwipe } from '../../hooks/useSwipe';
import { useViewportGap } from '../../hooks/useViewportGap';
import type { MiniPlayerTag } from '../../selectors/miniPlayer';
import { PageDots, type PageDotVariant } from '../PageDots/PageDots';
import { ThemeScope } from '../ThemeScope/ThemeScope';
import styles from './MiniPlayer.module.css';
import { miniPlayerMode } from './miniPlayerMode';
import { MiniPlayerProgress } from './MiniPlayerProgress';
import { MiniPlayerRow } from './MiniPlayerRow';

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
}

/**
 * 主頁底部播放器（今日節目，或者載入緊嘅廣播劇）：跟節目轉色，左右掃轉節目，撳入節目頁 / 廣播劇頁。
 * 用 portal 掛喺 body：頁面 .scope 係 size container（會變成 position: fixed 嘅 containing block），
 * 掛喺 body 先保證係跟 viewport 定位，唔受頁面 .scope / #root 影響
 */
/** 指示點跟標籤色：重溫 = 藍（未揀中淡啲），今日 = 揀中時奶油金；冇標籤就普通點 */
const DOT_VARIANTS: Record<MiniPlayerTag, PageDotVariant> = { rewatch: 'blue', today: 'gold' };
const dotVariant = (tag: MiniPlayerTag | undefined): PageDotVariant | undefined =>
    tag && DOT_VARIANTS[tag];

export const MiniPlayer = ({
    region,
    labels,
    keys,
    index,
    tags = [],
    positionLabel,
    onChange,
    ...props
}: MiniPlayerProps) => {
    useViewportGap();
    const swipe = useSwipe((direction) => {
        // 掃過頭會循環返另一頭；得一個節目就唔郁
        const next = stepIndex(index, labels.length, direction, { wrap: true });
        if (next !== index) onChange(next);
    });

    // 得一段錄音：冇指示點，連個 wrapper 都唔畫，CSS 唔留指示點個位（data-mode）
    const mode = miniPlayerMode(keys);
    return createPortal(
        <ThemeScope theme={props.theme} fullPage={false} className={styles.wrapper}>
            <section className={styles.player} aria-label={region} data-mode={mode} {...swipe}>
                <MiniPlayerRow {...props} tag={tags[index]} />
                {mode === 'multi' && (
                    <div className={styles.dots}>
                        <PageDots
                            keys={keys}
                            labels={labels}
                            index={index}
                            onSelect={onChange}
                            variants={tags.map(dotVariant)}
                            positionLabel={positionLabel}
                        />
                    </div>
                )}
                <MiniPlayerProgress progress={props.progress} timeText={props.timeText} />
            </section>
        </ThemeScope>,
        document.body,
    );
};

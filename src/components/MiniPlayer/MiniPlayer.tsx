import { createPortal } from 'react-dom';
import type { ShowTheme } from '../../config/showThemes';
import { stepIndex, useSwipe } from '../../hooks/useSwipe';
import { useViewportGap } from '../../hooks/useViewportGap';
import { t } from '../../i18n/t';
import { PageDots } from '../PageDots/PageDots';
import { ThemeScope } from '../ThemeScope/ThemeScope';
import styles from './MiniPlayer.module.css';
import { MiniPlayerProgress } from './MiniPlayerProgress';
import { MiniPlayerRow } from './MiniPlayerRow';

export interface MiniPlayerProps {
    showName: string;
    theme: ShowTheme;
    subtitle: string;
    /** 例如「12:40 / 1:58:30」；未知長度時冇 */
    timeText?: string;
    isPlaying: boolean;
    /** 0–1 */
    progress: number;
    /** 今日所有節目名（按播出次序） */
    labels: string[];
    /** 同 labels 一樣次序嘅錄音 URL */
    keys: string[];
    index: number;
    onToggle: () => void;
    onOpen: () => void;
    onChange: (index: number) => void;
}

/**
 * 主頁底部嘅今日節目播放器：跟節目轉色，左右掃轉節目，撳入節目頁。
 * 用 portal 掛喺 body：頁面 .scope 係 size container（會變成 position: fixed 嘅 containing block），
 * #root 又 overflow: hidden，放喺入面推落 viewport 以下就會畀佢哋剪走
 */
export const MiniPlayer = ({ labels, keys, index, onChange, ...props }: MiniPlayerProps) => {
    useViewportGap();
    const swipe = useSwipe((direction) => {
        // 掃過頭會循環返另一頭；得一個節目就唔郁
        const next = stepIndex(index, labels.length, direction, { wrap: true });
        if (next !== index) onChange(next);
    });

    return createPortal(
        <ThemeScope theme={props.theme} fullPage={false} className={styles.wrapper}>
            <section className={styles.player} aria-label={t('miniPlayer.region')} {...swipe}>
                <MiniPlayerRow {...props} />
                <div className={styles.dots}>
                    <PageDots keys={keys} labels={labels} index={index} onSelect={onChange} />
                </div>
                <MiniPlayerProgress progress={props.progress} timeText={props.timeText} />
            </section>
        </ThemeScope>,
        document.body,
    );
};

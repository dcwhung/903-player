import type { ShowTheme } from '../../config/showThemes';
import { stepIndex, useSwipe } from '../../hooks/useSwipe';
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
    index: number;
    onToggle: () => void;
    onOpen: () => void;
    onChange: (index: number) => void;
}

/** 主頁底部嘅今日節目播放器：跟節目轉色，左右掃轉節目，撳入節目頁 */
export const MiniPlayer = ({ labels, index, onChange, ...props }: MiniPlayerProps) => {
    const swipe = useSwipe((direction) => {
        const next = stepIndex(index, labels.length, direction);
        if (next !== index) onChange(next);
    });

    return (
        <ThemeScope theme={props.theme} fullPage={false} className={styles.wrapper}>
            <section className={styles.player} aria-label={t('miniPlayer.region')} {...swipe}>
                <MiniPlayerRow {...props} />
                <div className={styles.dots}>
                    <PageDots labels={labels} index={index} onSelect={onChange} />
                </div>
                <MiniPlayerProgress progress={props.progress} timeText={props.timeText} />
            </section>
        </ThemeScope>
    );
};

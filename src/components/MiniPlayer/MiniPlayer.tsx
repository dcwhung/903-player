import type { ShowTheme } from '../../config/showThemes';
import { stepIndex, useSwipe } from '../../hooks/useSwipe';
import { t } from '../../i18n/t';
import { Disc } from '../Disc/Disc';
import { PauseIcon, PlayIcon } from '../icons/icons';
import { PageDots } from '../PageDots/PageDots';
import { ThemeScope } from '../ThemeScope/ThemeScope';
import styles from './MiniPlayer.module.css';

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

const PERCENT = 100;
const TOGGLE_ICON_SIZE = 20;

/** 主頁底部嘅今日節目播放器：跟節目轉色，左右掃轉節目，撳入節目頁 */
export const MiniPlayer = (props: MiniPlayerProps) => {
    const { showName, theme, isPlaying, progress, labels, index, onChange } = props;
    const swipe = useSwipe((direction) => {
        const next = stepIndex(index, labels.length, direction);
        if (next !== index) onChange(next);
    });
    const percent = Math.round(progress * PERCENT);

    return (
        <ThemeScope theme={theme} fullPage={false} className={styles.wrapper}>
            <section className={styles.player} aria-label={t('miniPlayer.region')} {...swipe}>
                <div className={styles.row}>
                    <button
                        type="button"
                        className={styles.open}
                        aria-label={t('miniPlayer.open', { name: showName })}
                        onClick={props.onOpen}
                    >
                        <Disc size="small" art={theme.art} />
                        <span className={styles.text}>
                            <span className={styles.name}>{showName}</span>
                            <span className={styles.subtitle}>{props.subtitle}</span>
                        </span>
                    </button>
                    <button
                        type="button"
                        className={styles.toggle}
                        aria-label={t(isPlaying ? 'player.pause' : 'player.play')}
                        onClick={props.onToggle}
                    >
                        {isPlaying ? (
                            <PauseIcon size={TOGGLE_ICON_SIZE} />
                        ) : (
                            <PlayIcon size={TOGGLE_ICON_SIZE} />
                        )}
                    </button>
                </div>
                <div className={styles.dots}>
                    <PageDots labels={labels} index={index} onSelect={onChange} />
                </div>
                <div
                    className={styles.progress}
                    role="progressbar"
                    aria-label={t('player.progress')}
                    aria-valuetext={props.timeText}
                    aria-valuemin={0}
                    aria-valuemax={PERCENT}
                    aria-valuenow={percent}
                >
                    <div className={styles.fill} style={{ width: `${percent}%` }} />
                </div>
            </section>
        </ThemeScope>
    );
};

import { useState } from 'react';
import { t } from '../../i18n/t';
import { usePlayer } from '../../player/usePlayer';
import { formatDuration } from '../../utils/time';
import { ArcSlider } from '../ArcSlider/ArcSlider';
import { Disc } from '../Disc/Disc';
import { RestartIcon } from '../icons/icons';
import { PlayerControls } from '../PlayerControls/PlayerControls';
import styles from './PlayerPanel.module.css';

interface PlayerPanelProps {
    title: string;
    dateLabel: string;
}

const RESTART_ICON_SIZE = 22;

/** 唱片 + 弧形進度 + 時間 + 控制掣，節目頁同今日節目頁共用 */
export const PlayerPanel = ({ title, dateLabel }: PlayerPanelProps) => {
    const player = usePlayer();
    const [previewTime, setPreviewTime] = useState<number | null>(null);
    const total = formatDuration(player.duration);
    const formatValueText = (seconds: number) =>
        t('player.progressText', { current: formatDuration(seconds), total });

    return (
        <div className={styles.panel}>
            <div className={styles.gauge}>
                <div className={styles.arc}>
                    <ArcSlider
                        value={player.currentTime}
                        max={player.duration}
                        onSeek={player.seek}
                        onPreview={setPreviewTime}
                        label={t('player.progress')}
                        formatValueText={formatValueText}
                    />
                </div>
                <div className={styles.discArea}>
                    <Disc />
                </div>
                <span className={`${styles.time} ${styles.elapsed}`}>
                    {formatDuration(previewTime ?? player.currentTime)}
                </span>
                <span className={`${styles.time} ${styles.total}`}>{total}</span>
                <button
                    type="button"
                    className={styles.restart}
                    aria-label={t('player.restart')}
                    onClick={() => void player.restart()}
                >
                    <RestartIcon size={RESTART_ICON_SIZE} />
                </button>
            </div>
            <div className={styles.titles}>
                <span className={styles.date}>{dateLabel}</span>
                <h1 className={styles.title}>{title}</h1>
            </div>
            <PlayerControls
                isPlaying={player.isPlaying}
                onToggle={() => void player.toggle()}
                onSkip={player.skip}
            />
        </div>
    );
};

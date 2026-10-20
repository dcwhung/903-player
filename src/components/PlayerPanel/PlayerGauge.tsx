import { useState, type RefObject } from 'react';
import { t } from '../../i18n/t';
import { usePlayer } from '../../player/usePlayer';
import { formatDuration } from '../../utils/time';
import { ArcSlider } from '../ArcSlider/ArcSlider';
import { Disc } from '../Disc/Disc';
import { RestartIcon } from '../icons/icons';
import styles from './PlayerPanel.module.css';

interface PlayerGaugeProps {
    /** 節目圖，做碟嘅底色 */
    art?: string | undefined;
    /** 節目頁日子條拖動時跟住轉嘅節目圖 */
    artRef?: RefObject<HTMLImageElement | null>;
}

const RESTART_ICON_SIZE = 22;

/** 未知時長（未載到 metadata）顯示佔位，唔顯示 0:00 */
const formatTotal = (duration: number): string =>
    duration > 0 ? formatDuration(duration) : t('player.unknownDuration');

/** 唱片 + 弧形進度 + 時間 + 由頭播放：節目頁播放器同今日節目卡共用 */
export const PlayerGauge = ({ art, artRef }: PlayerGaugeProps) => {
    const player = usePlayer();
    const [previewTime, setPreviewTime] = useState<number | null>(null);
    const total = formatDuration(player.duration);
    const formatValueText = (seconds: number) =>
        t('player.progressText', { current: formatDuration(seconds), total });

    return (
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
                <Disc art={art} artRef={artRef} />
            </div>
            <span className={`${styles.time} ${styles.elapsed}`}>
                {formatDuration(previewTime ?? player.currentTime)}
            </span>
            <span className={`${styles.time} ${styles.total}`}>{formatTotal(player.duration)}</span>
            <button
                type="button"
                className={styles.restart}
                aria-label={t('player.restart')}
                onClick={() => void player.restart()}
            >
                <RestartIcon size={RESTART_ICON_SIZE} />
            </button>
        </div>
    );
};

import type { RefObject } from 'react';
import { t } from '../../i18n/t';
import { formatDuration } from '../../utils/time';
import { ArcSlider } from '../ArcSlider/ArcSlider';
import { Disc } from '../Disc/Disc';
import { RestartIcon } from '../icons/icons';
import styles from './PlayerPanel.module.css';
import { useGaugeGestures } from './useGaugeGestures';

interface PlayerGaugeProps {
    /** 節目圖，做碟嘅底色 */
    art?: string | undefined;
    /** 節目頁日子條拖動時跟住轉嘅節目圖 */
    artRef?: RefObject<HTMLImageElement | null>;
    /** 日子條拖緊（捉住碟）：碟唔自轉 */
    held?: boolean;
}

const RESTART_ICON_SIZE = 22;

/** 未知時長（未載到 metadata，例如斷網）時間都唔可信：顯示佔位，唔顯示 0:00 / 續播位置 */
const formatClock = (seconds: number, known: boolean): string =>
    known ? formatDuration(seconds) : t('player.unknownDuration');

/** 唱片 + 弧形進度 + 時間 + 由頭播放：節目頁播放器同今日節目卡共用 */
export const PlayerGauge = ({ art, artRef, held = false }: PlayerGaugeProps) => {
    const { player, known, shownTime, arc, disc } = useGaugeGestures(held);
    // 讀屏同畫面一樣：未知時長讀佔位，唔讀 0:00
    const total = formatClock(player.duration, known);
    const formatValueText = (seconds: number) =>
        t('player.progressText', { current: formatClock(seconds, known), total });

    return (
        <div className={styles.gauge}>
            <div className={styles.arc}>
                <ArcSlider
                    {...arc}
                    max={player.duration}
                    onSeek={player.seek}
                    label={t('player.progress')}
                    formatValueText={formatValueText}
                />
            </div>
            <div className={styles.discArea}>
                <Disc art={art} artRef={artRef} {...disc} />
            </div>
            <span className={`${styles.time} ${styles.elapsed}`}>
                {formatClock(shownTime, known)}
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
    );
};

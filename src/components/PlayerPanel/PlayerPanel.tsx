import { useRef, useState, type ReactNode } from 'react';
import type { SwipeDirection } from '../../hooks/swipe';
import { t } from '../../i18n/t';
import { usePlayer } from '../../player/usePlayer';
import { formatDuration } from '../../utils/time';
import { ArcSlider } from '../ArcSlider/ArcSlider';
import type { StripNeighbours } from '../DateStrip/dateStrip';
import { Disc } from '../Disc/Disc';
import { RestartIcon } from '../icons/icons';
import { PlayerControls } from '../PlayerControls/PlayerControls';
import { PlayerCaption } from './PlayerCaption';
import styles from './PlayerPanel.module.css';

interface PlayerPanelProps {
    title: string;
    dateLabel: string;
    /** 節目圖，做碟嘅底色 */
    art?: string;
    /** 標題下面嘅額外內容（例如今日節目指示點） */
    accessory?: ReactNode;
    /**
     * 節目頁：有傳就用日子條代替日期 + 節目名（節目名喺頁頭），左右掃 / 撳隔籬日期轉集，
     * 返回有冇真係轉（今日節目頁由外面嘅卡疊處理 swipe，唔使傳）
     */
    onStep?: (direction: SwipeDirection) => boolean;
    /** 節目頁日子條兩邊嘅新一集 / 舊一集日期（配合 onStep） */
    neighbours?: StripNeighbours;
}

const RESTART_ICON_SIZE = 22;

/** 唱片 + 弧形進度 + 時間 + 控制掣，節目頁同今日節目頁共用 */
export const PlayerPanel = (props: PlayerPanelProps) => {
    const player = usePlayer();
    // 日子條拖動時跟住轉嘅節目圖
    const artRef = useRef<HTMLImageElement>(null);
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
                    <Disc art={props.art} artRef={artRef} />
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
            <PlayerCaption {...props} spinRef={artRef} />
            <PlayerControls
                isPlaying={player.isPlaying}
                onToggle={() => void player.toggle()}
                onSkip={player.skip}
            />
        </div>
    );
};

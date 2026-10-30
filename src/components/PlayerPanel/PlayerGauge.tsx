import type { RefObject } from 'react';
import { t } from '../../i18n/t';
import { formatDuration } from '../../utils/time';
import { ArcSlider } from '../ArcSlider/ArcSlider';
import { Disc } from '../Disc/Disc';
import { GaugeActions } from './GaugeActions';
import styles from './PlayerPanel.module.css';
import { useGaugeGestures } from './useGaugeGestures';

interface PlayerGaugeProps {
    /** 節目圖，做碟嘅底色 */
    art?: string | undefined;
    /** 節目頁日子條拖動時跟住轉嘅節目圖 */
    artRef?: RefObject<HTMLImageElement | null>;
    /** 日子條拖緊（捉住碟）：碟唔自轉 */
    held?: boolean;
    /**
     * 有傳 = player 未載入呢頁嘅嘢（例如劇集頁播緊其他節目）：時間佔位、弧形空、碟唔轉、掣係播放樣，
     * 撳播放 / 由頭播放就叫呢個開始播呢頁；唔跟住顯示其他嘢嘅時間同播放狀態
     */
    onStart?: (() => void) | undefined;
    /**
     * 未開始樣（onStart）時撳播放會續播嘅位置同總長（例如廣播劇聽過未載入）：時間、弧形顯示返佢（鎖住，
     * 拖唔到）；冇就時間佔位、弧形空
     */
    standbyTime?: StandbyTime | undefined;
    /** 主頁播放卡嘅過場名（內頁由 global.css 喺過場期間先改名） */
    transitionName?: string | undefined;
}

/** 未開始樣時要顯示嘅續播位置 / 總長（秒） */
export interface StandbyTime {
    position: number;
    duration: number;
}

/** 未知時長（未載到 metadata，例如斷網）時間都唔可信：顯示佔位，唔顯示 0:00 / 續播位置 */
const formatClock = (seconds: number, known: boolean): string =>
    known ? formatDuration(seconds) : t('player.unknownDuration');

/** 未開始樣：弧形鎖住，拖唔到亦 seek 唔到 */
const ignore = () => undefined;

/**
 * 唱片格要顯示嘅嘢：平時跟 player；有 onStart（未載入呢頁嘅嘢）就成個係未開始樣，唔跟 player，
 * 冇「由頭播放」（未載入時 onStart 會續播，唔係由頭，S-485）
 */
const useGaugeView = (
    held: boolean,
    onStart: (() => void) | undefined,
    standbyTime: StandbyTime | undefined,
) => {
    const { player, known, shownTime, arc, disc } = useGaugeGestures(held);
    if (onStart) {
        const position = standbyTime?.position ?? 0;
        return {
            known: standbyTime !== undefined,
            shownTime: position,
            max: standbyTime?.duration ?? 0,
            seek: ignore,
            isPlaying: false,
            arc: { value: position, locked: true, onPreview: ignore },
            disc: { faceRef: disc.faceRef, spinning: false, upright: true, scrub: undefined },
            toggle: onStart,
            restart: undefined,
        };
    }
    const { duration: max, seek, isPlaying } = player;
    const toggle = () => void player.toggle();
    const restart = () => void player.restart();
    return { known, shownTime, max, seek, isPlaying, arc, disc, toggle, restart };
};

/** 唱片 + 弧形進度 + 時間 + 由頭播放：節目頁播放器同今日節目卡共用 */
export const PlayerGauge = ({
    art,
    artRef,
    held = false,
    onStart,
    standbyTime,
    transitionName,
}: PlayerGaugeProps) => {
    const { known, shownTime, max, isPlaying, ...view } = useGaugeView(held, onStart, standbyTime);
    // 讀屏同畫面一樣：未知時長讀佔位，唔讀 0:00
    const total = formatClock(max, known);
    const formatValueText = (seconds: number) =>
        t('player.progressText', { current: formatClock(seconds, known), total });
    return (
        <div
            className={styles.gauge}
            style={{ viewTransitionName: transitionName }}
            data-player-gauge=""
        >
            <div className={styles.arc}>
                <ArcSlider
                    {...view.arc}
                    max={max}
                    onSeek={view.seek}
                    label={t('player.progress')}
                    formatValueText={formatValueText}
                />
            </div>
            <div className={styles.discArea}>
                <Disc art={art} artRef={artRef} {...view.disc} />
            </div>
            {/* 外框止喺掣旁邊，入面嘅字放唔落就向外伸（見 PlayerPanel.module.css .time） */}
            <span className={`${styles.time} ${styles.elapsed}`}>
                <span>{formatClock(shownTime, known)}</span>
            </span>
            <span className={`${styles.time} ${styles.total}`}>
                <span>{total}</span>
            </span>
            <GaugeActions isPlaying={isPlaying} onRestart={view.restart} onToggle={view.toggle} />
        </div>
    );
};

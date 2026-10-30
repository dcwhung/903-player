import { useRef, useState } from 'react';
import { usePlayer } from '../../player/usePlayer';
import { hasKnownDuration } from '../../utils/time';
import { DateStrip } from '../DateStrip/DateStrip';
import type { StripDay } from '../DateStrip/dateStrip';
import { PlayerGauge } from './PlayerGauge';
import styles from './PlayerPanel.module.css';

interface PlayerPanelProps {
    /** 節目名：畫面顯示喺頁頭，日子條只係攞嚟做轉集區個名 */
    title: string;
    dateLabel: string;
    /** 節目圖，做碟嘅底色 */
    art?: string | undefined;
    /** 日子條嘅日子（由新到舊）同現正播放嗰日嘅 index */
    days: readonly StripDay[];
    currentDay: number;
    /** 喺日子條揀咗另一日：播嗰集 */
    onPick: (url: string) => void;
    /** player 載入緊其他嘢先有：唱片係未開始樣，撳播放就開始播呢頁（見 PlayerGauge） */
    onStart?: (() => void) | undefined;
}

/** 節目頁播放器：唱片 + 弧形進度 + 播放掣 + 日子條 */
export const PlayerPanel = ({
    title,
    dateLabel,
    art,
    days,
    currentDay,
    onPick,
    onStart,
}: PlayerPanelProps) => {
    // 日子條拖動時跟住轉嘅節目圖
    const artRef = useRef<HTMLImageElement>(null);
    // 拖緊日子條 = 捉住碟，碟唔自轉
    const [held, setHeld] = useState(false);
    const { duration } = usePlayer();
    return (
        <div className={styles.panel}>
            <PlayerGauge art={art} artRef={artRef} held={held} onStart={onStart} />
            <DateStrip
                title={title}
                // 未開始（onStart）時 duration 係其他嘢嘅，唔講「連線中…」
                connecting={!onStart && !hasKnownDuration(duration)}
                dateLabel={dateLabel}
                days={days}
                current={currentDay}
                onPick={onPick}
                spinRef={artRef}
                onHold={setHeld}
            />
        </div>
    );
};

import { useRef, useState } from 'react';
import { DateStrip } from '../DateStrip/DateStrip';
import type { StripDay } from '../DateStrip/dateStrip';
import { PlayerGauge } from './PlayerGauge';
import styles from './PlayerPanel.module.css';
import { PlayerTransport } from './PlayerTransport';

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
}

/** 節目頁播放器：唱片 + 弧形進度 + 日子條 + 控制掣 */
export const PlayerPanel = ({
    title,
    dateLabel,
    art,
    days,
    currentDay,
    onPick,
}: PlayerPanelProps) => {
    // 日子條拖動時跟住轉嘅節目圖
    const artRef = useRef<HTMLImageElement>(null);
    // 拖緊日子條 = 捉住碟，碟唔自轉
    const [held, setHeld] = useState(false);
    return (
        <div className={styles.panel}>
            <PlayerGauge art={art} artRef={artRef} held={held} />
            <DateStrip
                title={title}
                dateLabel={dateLabel}
                days={days}
                current={currentDay}
                onPick={onPick}
                spinRef={artRef}
                onHold={setHeld}
            />
            <PlayerTransport />
        </div>
    );
};

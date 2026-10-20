import { useRef } from 'react';
import type { SwipeDirection } from '../../hooks/swipe';
import { DateStrip } from '../DateStrip/DateStrip';
import type { StripNeighbours } from '../DateStrip/dateStrip';
import { PlayerGauge } from './PlayerGauge';
import styles from './PlayerPanel.module.css';
import { PlayerTransport } from './PlayerTransport';

interface PlayerPanelProps {
    /** 節目名：畫面顯示喺頁頭，日子條只係攞嚟做轉集區個名 */
    title: string;
    dateLabel: string;
    /** 節目圖，做碟嘅底色 */
    art?: string | undefined;
    /** 左右掃 / 撳隔籬日期轉集，返回有冇真係轉 */
    onStep: (direction: SwipeDirection) => boolean;
    /** 日子條兩邊嘅新一集 / 舊一集日期 */
    neighbours: StripNeighbours;
}

/** 節目頁播放器：唱片 + 弧形進度 + 日子條 + 控制掣 */
export const PlayerPanel = ({ title, dateLabel, art, onStep, neighbours }: PlayerPanelProps) => {
    // 日子條拖動時跟住轉嘅節目圖
    const artRef = useRef<HTMLImageElement>(null);
    return (
        <div className={styles.panel}>
            <PlayerGauge art={art} artRef={artRef} />
            <DateStrip
                title={title}
                dateLabel={dateLabel}
                neighbours={neighbours}
                onStep={onStep}
                spinRef={artRef}
            />
            <PlayerTransport />
        </div>
    );
};

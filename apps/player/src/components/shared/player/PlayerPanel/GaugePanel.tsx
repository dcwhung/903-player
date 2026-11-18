import type { ReactNode } from 'react';
import type { Track } from '../../../../types/track';
import { PlayerGauge } from './PlayerGauge';
import styles from './PlayerPanel.module.css';

interface GaugePanelProps {
    /** 節目圖，做碟嘅底色 */
    art?: string | undefined;
    /** player 載入緊其他嘢先有：唱片係未開始樣，撳播放先開始播（見 PlayerGauge） */
    onStart?: (() => void) | undefined;
    /** 顯示緊嘅一集（收藏掣用） */
    bookmark?: Track | undefined;
    /** 唱片下面嘅嘢（例如 HomeView 今日節目頁「現正播放」+ 節目 selector） */
    children: ReactNode;
}

/**
 * 普通播放器（唱片 + 弧形進度 + 播放掣）+ 下面自訂嘅一組：同 PlayerPanel 一樣嘅 .panel，
 * 只係冇日子條（HomeView 今日節目頁，P10 lane 7a：每個節目今日得一集，下面換做節目 selector）
 */
export const GaugePanel = ({ art, onStart, bookmark, children }: GaugePanelProps) => (
    <div className={styles.panel}>
        <PlayerGauge art={art} onStart={onStart} bookmark={bookmark} />
        {children}
    </div>
);

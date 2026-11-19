import type { ComponentProps, ReactNode } from 'react';
import { PlayerGauge } from './PlayerGauge';
import styles from './PlayerPanel.module.css';

type GaugePanelProps = ComponentProps<typeof PlayerGauge> & {
    /** 唱片下面嘅嘢（例如 HomeView 今日節目頁「現正播放」+ 節目 selector） */
    children: ReactNode;
};

/**
 * 普通播放器（唱片 + 弧形進度 + 播放掣）+ 下面自訂嘅一組：同 PlayerPanel 一樣嘅 .panel，
 * 只係冇日子條（HomeView 今日節目頁，P10 lane 7a：每個節目今日得一集，下面換做節目 selector；
 * 廣播劇頁 lane 7b：下面係短篇名 + 集名，唱片嘅未開始 / 冇揀短篇樣照傳畀 PlayerGauge）
 */
export const GaugePanel = ({ children, ...gauge }: GaugePanelProps) => (
    <div className={styles.panel}>
        <PlayerGauge {...gauge} />
        {children}
    </div>
);

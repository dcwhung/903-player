import type { ReactNode } from 'react';
import { InfoButton } from '../../player/PlayerPanel/GaugeInfoRow';
import styles from './PageHeader.module.css';

interface PageHeaderActionsProps {
    /** 清單掣（ListButton）等，喺 ⓘ 左邊 */
    children: ReactNode;
    /** 有資料先傳：ⓘ 擺最右（同 PlayerPanel gaugeInfo 一樣嘅 props） */
    info?: { onInfo: () => void; infoLabel: string } | undefined;
}

/**
 * 頁頭右邊一組掣（HomeView，P10 lane 6，_mockups_/home-view .hd.v4）：清單掣 + ⓘ。
 * 傳畀 PageHeader 嘅 trailing；頁頭見到佢就左右兩格一樣闊（標題置中，PageHeader.module.css）
 */
export const PageHeaderActions = ({ children, info }: PageHeaderActionsProps) => (
    <div className={styles.actions} data-header-actions="">
        {children}
        {info && <InfoButton onInfo={info.onInfo} label={info.infoLabel} className={styles.info} />}
    </div>
);

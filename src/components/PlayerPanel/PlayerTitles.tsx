import type { ReactNode } from 'react';
import styles from './PlayerPanel.module.css';

interface PlayerTitlesProps {
    title: string;
    dateLabel: string;
    accessory?: ReactNode;
}

/** 唱片下面嘅日期同節目名（今日節目頁：轉節目時節目名會變，所以要顯示） */
export const PlayerTitles = ({ title, dateLabel, accessory }: PlayerTitlesProps) => (
    <div className={styles.titles}>
        <span className={styles.date}>{dateLabel}</span>
        <h1 className={styles.title}>{title}</h1>
        {accessory}
    </div>
);

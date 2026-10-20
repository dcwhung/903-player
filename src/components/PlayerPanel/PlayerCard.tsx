import { PlayerGauge } from './PlayerGauge';
import styles from './PlayerPanel.module.css';

interface PlayerCardProps {
    title: string;
    /** 節目圖，做碟嘅底色 */
    art?: string | undefined;
}

/**
 * 今日節目卡疊最上面嗰張：只有唱片、進度弧同節目名（同後面嘅 GhostCard 一樣），
 * 控制掣每個節目都一樣，放喺卡疊外面（TodayPage）
 */
export const PlayerCard = ({ title, art }: PlayerCardProps) => (
    <div className={styles.panel}>
        <PlayerGauge art={art} />
        <h2 className={styles.title}>{title}</h2>
    </div>
);

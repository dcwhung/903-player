import { Marquee } from '../Marquee/Marquee';
import { PlayerGauge } from './PlayerGauge';
import styles from './PlayerPanel.module.css';

interface PlayerCardProps {
    title: string;
    /** 節目圖，做碟嘅底色 */
    art?: string | undefined;
}

/**
 * 今日節目卡疊最上面嗰張：唱片、進度弧、由頭播放 / 播放掣同節目名
 * （後面嘅 GhostCard 只有唱片同節目名）
 */
export const PlayerCard = ({ title, art }: PlayerCardProps) => (
    <div className={styles.panel}>
        <PlayerGauge art={art} />
        <h2 className={styles.title}>
            <Marquee text={title} />
        </h2>
    </div>
);

import {
    EpisodeList,
    type EpisodeItem,
    type EpisodeLabels,
    type EpisodeScrollAlign,
} from '../EpisodeList/EpisodeList';
import styles from './HomePlayerCard.module.css';

export interface HomeCardEpisodes {
    items: EpisodeItem[];
    labels: EpisodeLabels;
    scrollAlign: EpisodeScrollAlign;
    onSelect: (key: string) => void;
}

/** 集數清單：同內頁一樣（「集數 · 共 N 集」、行款、揀中行捲入畫面），食晒卡剩低嘅高度自己捲 */
export const CardEpisodes = (props: HomeCardEpisodes) => (
    <div className={styles.episodes}>
        <EpisodeList {...props} />
    </div>
);

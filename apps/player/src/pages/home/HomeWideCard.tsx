import { memo } from 'react';
import { HomePlayerCard } from '../../components/pages/home/HomePlayerCard/HomePlayerCard';
import type { MiniPlayerProps } from '../../components/pages/home/MiniPlayer/MiniPlayer';
import { withViewTransition } from '../../utils/viewTransition';
import styles from './HomePage.module.css';
import { useHomeCardEpisodes } from './useHomeCardEpisodes';
import { useHomeCardGauge } from './useHomeCardGauge';

interface SplitCardProps {
    miniPlayer: MiniPlayerProps;
    onClose: () => void;
    focusOnMount: boolean;
}

/**
 * 右邊播放卡：mini player 嘅節目 / 劇集，唱片格跟 useHomeCardGauge，下面係同內頁一樣嘅集數清單。
 * 入頁、收埋都用過場（View Transitions，減少動畫就即刻轉）
 */
const SplitCard = ({ miniPlayer, onClose, focusOnMount }: SplitCardProps) => {
    const gauge = useHomeCardGauge(miniPlayer);
    const episodes = useHomeCardEpisodes(miniPlayer.keys[miniPlayer.index]);
    const expand = () => withViewTransition(miniPlayer.onOpen, 'expand');
    return (
        <div className={styles.cardColumn}>
            <HomePlayerCard
                {...miniPlayer}
                gauge={gauge}
                episodes={episodes}
                onExpand={expand}
                onClose={onClose}
                focusOnMount={focusOnMount}
            />
        </div>
    );
};

interface HomeWideCardProps extends SplitCardProps {
    /**
     * 換節目過場（switch）等緊瀏覽器影舊畫面：唔 re-render，張卡照顯示舊節目，
     * 影完 useCardMotion 先放開（舊卡反轉出、新卡反轉入）
     */
    frozen: boolean;
}

/** frozen 期間當 props 冇變（React 沿用上次 render 出嚟嘅舊卡） */
const keepWhileFrozen = (_: HomeWideCardProps, next: HomeWideCardProps) => next.frozen;

export const HomeWideCard = memo<HomeWideCardProps>(
    ({ frozen: _frozen, ...props }) => <SplitCard {...props} />,
    keepWhileFrozen,
);
HomeWideCard.displayName = 'HomeWideCard';

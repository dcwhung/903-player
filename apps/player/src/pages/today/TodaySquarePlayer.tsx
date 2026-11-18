import {
    ShowSelector,
    type ShowSelectorItem,
} from '../../components/pages/today/ShowSelector/ShowSelector';
import type { TodayShowItem } from '../../components/pages/today/TodayShowList/TodayShowList';
import { NowPlaying } from '../../components/shared/player/NowPlaying/NowPlaying';
import { GaugePanel } from '../../components/shared/player/PlayerPanel/GaugePanel';
import { usePlayer } from '../../player/usePlayer';
import type { Recording } from '../../types/recording';
import { formatDateLabel, formatSpokenDate } from '../../utils/date';
import { hasKnownDuration } from '../../utils/time';
import page from '../shared/Page.module.css';
import type { TodayView } from './useTodayPage';

/** selector 每格：節目表每行（播出次序，包括未上架） */
const toSelectorItems = (items: readonly TodayShowItem[]): ShowSelectorItem[] =>
    items.map(({ key, name, art, status }) => ({
        key,
        name,
        art,
        available: status !== 'unavailable',
    }));

interface TodaySquarePlayerProps {
    state: Pick<TodayView, 'current' | 'start' | 'items' | 'cardKeys' | 'theme' | 'selectIndex'>;
    current: Recording;
}

/**
 * 普通播放器（同 HomeView 節目頁一樣，冇卡疊 / 左右掃 / 指示點）+「現正播放：日子」+ 節目 selector。
 * 撳 selector 一格 = 卡疊轉去嗰張（selectIndex：播緊其他嘢就淨係換睇，撳播放先播）
 */
export const TodaySquarePlayer = ({ state, current }: TodaySquarePlayerProps) => {
    const { start, items, cardKeys, theme, selectIndex } = state;
    const { duration } = usePlayer();
    const selectedKey = items.find((item) => item.track?.url === current.url)?.key;
    const select = (key: string) => {
        const url = items.find((item) => item.key === key)?.track?.url;
        const index = url === undefined ? -1 : cardKeys.indexOf(url);
        if (index >= 0 && key !== selectedKey) selectIndex(index);
    };
    return (
        <GaugePanel art={theme.art} onStart={start} bookmark={current}>
            <div className={page.squareFooter}>
                <NowPlaying
                    label={formatDateLabel(current.date)}
                    spokenLabel={formatSpokenDate(current.date)}
                    // 未開始（播緊其他嘢）時 duration 唔係呢個節目嘅，唔講「連線中…」
                    connecting={!start && !hasKnownDuration(duration)}
                />
                <ShowSelector
                    items={toSelectorItems(items)}
                    selectedKey={selectedKey}
                    onSelect={select}
                />
            </div>
        </GaugePanel>
    );
};

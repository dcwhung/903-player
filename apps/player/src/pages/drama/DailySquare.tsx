import type { DramaConfig } from '@903-player/catalog';
import { ItemInfoSheet } from '../../components/shared/common/ItemInfo/ItemInfoSheet';
import { ListSheet } from '../../components/shared/common/ListSheet/ListSheet';
import { StatusMessage } from '../../components/shared/common/StatusMessage/StatusMessage';
import { ThemeScope } from '../../components/shared/common/ThemeScope/ThemeScope';
import {
    EpisodeList,
    episodeCountText,
} from '../../components/shared/player/EpisodeList/EpisodeList';
import { InnerPageHandle } from '../../components/shared/player/InnerPageHandle/InnerPageHandle';
import { PlayerPanel } from '../../components/shared/player/PlayerPanel/PlayerPanel';
import { useListSheet } from '../../hooks/useListSheet';
import { t } from '../../i18n/t';
import { formatSpokenDate } from '../../utils/date';
import page from '../shared/Page.module.css';
import { ShowHeaderActions, listSheetInfo } from '../show/ShowEpisodes';
import { DramaHeader } from './DramaHeader';
import type { useDailyDramaPage } from './useDramaPage';

type DailyView = ReturnType<typeof useDailyDramaPage>;

/** 唱片 + 日子條（同 HomeView 節目頁一樣，ⓘ 喺頁頭，唱片圈唔出） */
const DailySquarePlayer = ({ drama, view }: { drama: DramaConfig; view: DailyView }) => {
    const { current, start, strip, theme } = view;
    if (!current) return <StatusMessage message={t('episodes.noneUp')} />;
    return (
        <PlayerPanel
            title={drama.name}
            dateLabel={formatSpokenDate(current.date)}
            // 播緊其他嘢（start 有值）：黑碟、未開始樣，同其他裝置每日劇集頁一樣
            art={start ? undefined : theme.art}
            days={strip.days}
            currentDay={strip.current}
            onPick={view.selectEpisode}
            onStart={start}
            bookmark={current}
        />
    );
};

/**
 * HomeView 每日劇集頁（SQUARE_QUERY，P10 lane 7b）：mockup 冇畫，跟 HomeView 節目頁（lane 6）做——
 * 播放器為主（唱片 + 日子條），集數清單收入頁頭清單掣（badge = 集數）開嘅 sheet，ⓘ 喺頁頭。
 * 由「我的收藏」入嚟（focusKey）自動開清單 sheet；第一次入自動彈劇集資料（useDailyInfo）照舊
 */
export const DailySquare = ({ drama, view }: { drama: DramaConfig; view: DailyView }) => {
    const list = useListSheet(view.focusKey);
    const { items, info } = view;
    const listed = view.current !== undefined;
    return (
        <ThemeScope theme={view.theme}>
            <main
                className={`${page.page} ${page.locked} ${page.fixed}`}
                data-player-page=""
                data-square-player=""
            >
                <DramaHeader
                    title={drama.name}
                    trailing={
                        listed && (
                            <ShowHeaderActions items={items} list={list} info={info.gaugeInfo} />
                        )
                    }
                />
                <DailySquarePlayer drama={drama} view={view} />
                <ListSheet
                    open={list.open}
                    onClose={list.close}
                    title={t('episodes.title')}
                    summary={episodeCountText(items)}
                    returnFocusTo={list.buttonRef}
                    {...listSheetInfo(info.sheet)}
                >
                    <EpisodeList
                        items={items}
                        onSelect={view.pressEpisode}
                        labels="taggedDate"
                        focusKey={view.focusKey}
                        heading={false}
                    />
                </ListSheet>
                <ItemInfoSheet {...info.sheet} onClose={info.sheet.close} />
                <InnerPageHandle page={{ kind: 'drama', dramaId: drama.id }} />
            </main>
        </ThemeScope>
    );
};

import type { DramaConfig } from '@903-player/catalog';
import { EpisodeList } from '../../components/shared/player/EpisodeList/EpisodeList';
import { InnerPageHandle } from '../../components/shared/player/InnerPageHandle/InnerPageHandle';
import { NowPlaying } from '../../components/shared/player/NowPlaying/NowPlaying';
import { PlayerPanel } from '../../components/shared/player/PlayerPanel/PlayerPanel';
import { ItemInfoSheet } from '../../components/shared/common/ItemInfo/ItemInfoSheet';
import { StatusMessage } from '../../components/shared/common/StatusMessage/StatusMessage';
import { ThemeScope } from '../../components/shared/common/ThemeScope/ThemeScope';
import { DUO_OPEN_PORTRAIT_QUERY, LANDSCAPE_LAYOUT_QUERY, SQUARE_QUERY } from '../../config/layout';
import { useEpisodeFocus } from '../../hooks/useEpisodeFocus';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { usePlayer } from '../../player/usePlayer';
import { t } from '../../i18n/t';
import { formatDateLabel, formatSpokenDate } from '../../utils/date';
import { hasKnownDuration } from '../../utils/time';
import { DailySquare } from './DailySquare';
import { DramaHeader } from './DramaHeader';
import page from '../shared/Page.module.css';
import { useDailyDramaPage } from './useDramaPage';

type DailyView = ReturnType<typeof useDailyDramaPage>;

interface DailyPlayerProps {
    drama: DramaConfig;
    view: DailyView;
    current: NonNullable<DailyView['current']>;
    landscape: boolean;
}

/** 唱片 + 日子條（橫版加「現正播放」）+ 劇集資料 sheet（橫版喺唱片嗰欄，直版由畫面底彈出） */
const DailyPlayer = ({ drama, view, current, landscape }: DailyPlayerProps) => {
    const { duration } = usePlayer();
    const { theme, start, strip, info } = view;
    // Duo 打開・直（P10 lane 5b，W-793）：日子直排喺唱片右邊，同節目頁一樣
    const stripSide = useMediaQuery(DUO_OPEN_PORTRAIT_QUERY);
    return (
        <>
            <PlayerPanel
                title={drama.name}
                dateLabel={formatSpokenDate(current.date)}
                art={start ? undefined : theme.art}
                days={strip.days}
                currentDay={strip.current}
                onPick={view.selectEpisode}
                onStart={start}
                bookmark={current}
                stripSide={stripSide}
                {...info.gaugeInfo}
            />
            {landscape && (
                <NowPlaying
                    label={formatDateLabel(current.date)}
                    spokenLabel={formatSpokenDate(current.date)}
                    connecting={!start && !hasKnownDuration(duration)}
                />
            )}
            <ItemInfoSheet {...info.sheet} onClose={info.sheet.close} docked={landscape} />
        </>
    );
};

/**
 * 每日劇集：同節目頁一樣嘅版面（唱片 + 日子條，直版下面 / 橫版左欄集數清單）。
 * 成頁固定唔捲，得集數清單自己捲（Page.module.css .locked / .fixed）。
 * 播緊其他嘢（start 有值）：黑碟、未開始樣，同短篇劇集頁一樣
 */
export const DailyDramaPage = ({ drama }: { drama: DramaConfig }) => {
    // 由「我的收藏」撳行入嚟：唔播，清單捲去嗰集、短暫 highlight
    const focusId = useEpisodeFocus();
    const view = useDailyDramaPage(drama, focusId);
    const { current } = view;
    const landscape = useMediaQuery(LANDSCAPE_LAYOUT_QUERY);
    // HomeView（P10 lane 7b）：同節目頁一樣播放器為主，集數清單收入頁頭清單掣開嘅 sheet
    if (useMediaQuery(SQUARE_QUERY)) return <DailySquare drama={drama} view={view} />;
    // 橫版頁頭喺左欄清單上面（清單成日都有）
    return (
        <ThemeScope theme={view.theme}>
            <main className={`${page.page} ${page.locked} ${page.fixed}`} data-player-page="">
                <div className={page.playerColumn}>
                    {!landscape && <DramaHeader title={drama.name} />}
                    {current ? (
                        <DailyPlayer {...{ drama, view, current, landscape }} />
                    ) : (
                        <StatusMessage message={t('episodes.noneUp')} />
                    )}
                </div>
                <div className={page.listColumn}>
                    {landscape && <DramaHeader title={drama.name} />}
                    <EpisodeList
                        items={view.items}
                        onSelect={view.pressEpisode}
                        labels="taggedDate"
                        focusKey={view.focusKey}
                    />
                </div>
                <InnerPageHandle page={{ kind: 'drama', dramaId: drama.id }} />
            </main>
        </ThemeScope>
    );
};

import type { DramaConfig } from '@903-player/catalog';
import { ArcEpisodesSheet } from '../../components/pages/drama/ArcEpisodesSheet/ArcEpisodesSheet';
import { ListButton } from '../../components/shared/common/ListSheet/ListButton';
import { PageHeaderActions } from '../../components/shared/common/PageHeader/PageHeaderActions';
import { ItemInfoSheet } from '../../components/shared/common/ItemInfo/ItemInfoSheet';
import { ThemeScope } from '../../components/shared/common/ThemeScope/ThemeScope';
import { episodeCount } from '../../components/shared/player/EpisodeList/EpisodeList';
import { InnerPageHandle } from '../../components/shared/player/InnerPageHandle/InnerPageHandle';
import { arcLabelFor } from '../../catalog/dramas';
import { t } from '../../i18n/t';
import type { InfoBanner } from '../../selectors/itemInfo';
import page from '../shared/Page.module.css';
import { DramaHeader } from './DramaHeader';
import { SeriesArcSheet } from './SeriesListColumn';
import { SeriesSquarePlayer } from './SeriesSquarePlayer';
import type { SeriesDramaView } from './useDramaPage';
import { useSquareSheets } from './useSquareSheets';

type SquareSheets = ReturnType<typeof useSquareSheets>;

/** 清單掣 badge + 讀屏名：未揀短篇 = 短篇數；揀咗 = 嗰個短篇嘅集數 */
const listButtonOf = (drama: DramaConfig, view: SeriesDramaView, layer: SquareSheets['layer']) => {
    if (layer === 'all') {
        const count = view.arcs.length;
        return { count, label: t('listSheet.allArcs', { count }) };
    }
    const count = episodeCount(view.items);
    const arc = arcLabelFor(drama.id, view.arc ?? '');
    return { count, label: t('listSheet.arcEpisodes', { arc, count }) };
};

interface SeriesHeaderActionsProps {
    button: ReturnType<typeof listButtonOf>;
    sheets: SquareSheets;
    info: SeriesDramaView['gaugeInfo'];
    /** 全集表 / 短篇資料 / 短篇表自動開（冇撳過掣）閂咗焦點返清單掣（鍵盤閂先搬） */
    allRef: SeriesDramaView['sheet']['allRef'];
}

/** 頁頭右邊：清單掣 + ⓘ（未揀 = 全集表展開資料；已揀 = 短篇資料） */
const SeriesHeaderActions = ({ button, sheets, info, allRef }: SeriesHeaderActionsProps) => (
    <PageHeaderActions info={info}>
        <ListButton
            ref={allRef}
            label={button.label}
            count={button.count}
            open={sheets.open}
            onToggle={sheets.toggle}
        />
    </PageHeaderActions>
);

/** 短篇表頂橫額：同全集表一樣嘅劇集圖，名換做短篇名，細字「劇名 · 聽緊第 N 集」（唱片嗰集喺呢個短篇先講） */
const arcBanner = (drama: DramaConfig, view: SeriesDramaView): InfoBanner | undefined => {
    const art = view.sheet.banner?.art;
    if (!art || view.arc === undefined) return undefined;
    const listening = view.upNext?.arc === view.arc ? view.upNext : undefined;
    const subtitle = listening
        ? t('listSheet.arcListening', { drama: drama.name, no: listening.no })
        : drama.name;
    return { kind: 'arc', art, title: arcLabelFor(drama.id, view.arc), subtitle };
};

interface SeriesSquareProps {
    drama: DramaConfig;
    view: SeriesDramaView;
    /** 載入咗呢套劇但未讀到時長：狀態字講「連線中…」 */
    connecting: boolean;
}

/**
 * HomeView 短篇劇集頁（SQUARE_QUERY，P10 lane 7b，_mockups_/home-view 廣播劇頁）：播放器為主，
 * 冇短篇 chips / 集數清單；全集表 / 短篇表都由頁頭清單掣開，ⓘ 喺頁頭
 */
export const SeriesSquare = ({ drama, view, connecting }: SeriesSquareProps) => {
    const sheets = useSquareSheets(view);
    const { infoSheet } = view;
    return (
        <ThemeScope theme={view.theme}>
            <main
                className={`${page.page} ${page.locked} ${page.fixed}`}
                data-player-page=""
                data-square-player=""
                data-square-series=""
            >
                <DramaHeader
                    title={drama.name}
                    trailing={
                        <SeriesHeaderActions
                            button={listButtonOf(drama, view, sheets.layer)}
                            sheets={sheets}
                            info={view.gaugeInfo}
                            allRef={view.sheet.allRef}
                        />
                    }
                />
                <SeriesSquarePlayer view={view} connecting={connecting} />
                <SeriesArcSheet
                    sheet={{ ...view.sheet, pick: sheets.pickArc, close: sheets.closeAll }}
                    current={view.current}
                    docked={false}
                />
                <ArcEpisodesSheet
                    open={sheets.arcOpen}
                    onClose={sheets.closeAll}
                    banner={arcBanner(drama, view)}
                    items={view.items}
                    onSelect={view.pressEpisode}
                    focusKey={view.focusKey}
                    onShowAll={sheets.showAll}
                    returnFocusTo={view.sheet.allRef}
                />
                <ItemInfoSheet
                    {...infoSheet}
                    label={t('info.dramaInfo')}
                    onClose={infoSheet.close}
                />
                <InnerPageHandle page={{ kind: 'drama', dramaId: drama.id }} />
            </main>
        </ThemeScope>
    );
};

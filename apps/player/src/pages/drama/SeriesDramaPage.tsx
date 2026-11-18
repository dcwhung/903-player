import type { DramaConfig } from '@903-player/catalog';
import type { ReactNode } from 'react';
import { NowPlaying } from '../../components/shared/player/NowPlaying/NowPlaying';
import { InnerPageHandle } from '../../components/shared/player/InnerPageHandle/InnerPageHandle';
import { PlayerGauge } from '../../components/shared/player/PlayerPanel/PlayerGauge';
import { ItemInfoSheet } from '../../components/shared/common/ItemInfo/ItemInfoSheet';
import { StatusMessage } from '../../components/shared/common/StatusMessage/StatusMessage';
import { ThemeScope } from '../../components/shared/common/ThemeScope/ThemeScope';
import { DUO_OPEN_PORTRAIT_QUERY, LANDSCAPE_LAYOUT_QUERY } from '../../config/layout';
import { useEpisodeFocus } from '../../hooks/useEpisodeFocus';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { usePlayer } from '../../player/usePlayer';
import { t } from '../../i18n/t';
import { hasKnownDuration } from '../../utils/time';
import { DramaHeader } from './DramaHeader';
import { arcPickerLabel, seriesNowPlaying } from './seriesPageLabels';
import page from '../shared/Page.module.css';
import { SideRow } from '../shared/SideRow';
import { SeriesArcPicker, SeriesArcSheet, SeriesListColumn } from './SeriesListColumn';
import { useSeriesDramaPage, type SeriesDramaView } from './useDramaPage';

/**
 * 橫版「現正播放」有冇第二行（集名，或者聽緊時嘅成套劇下架字）：有就預留兩行高，唔係第二行會俾版面裁走
 */
const hasSecondLine = ({ upNext, notice, status }: SeriesPlayerColumnProps['view']): boolean =>
    Boolean(upNext?.title) || (notice !== undefined && status !== 'unloaded');

interface SeriesPlayerColumnProps {
    view: Pick<
        SeriesDramaView,
        | 'theme'
        | 'upNext'
        | 'start'
        | 'standbyTime'
        | 'empty'
        | 'status'
        | 'arcPosition'
        | 'arcTotal'
        | 'notice'
        | 'gaugeInfo'
        | 'infoSheet'
    >;
    title: string;
    landscape: boolean;
    connecting: boolean;
    /** Duo 打開・直：唱片右邊直排嘅短篇選擇（SeriesArcPicker vertical）；冇就照舊喺清單上面 */
    side?: ReactNode;
}

/**
 * 唱片欄：直版頁頭 + 唱片（未有集數就講冇）；橫版唱片下面加「現正播放」。
 * 未聽過又未載入呢套劇（第一次入未揀短篇）：碟面係冇圖嘅黑碟，同今日冇節目一樣；
 * 聽過未載入：碟面同「繼續收聽」跟撳播放會播嗰集（upNext）
 */
const SeriesPlayerColumn = ({
    view,
    title,
    landscape,
    connecting,
    side,
}: SeriesPlayerColumnProps) => {
    const { theme, upNext: current, start, status } = view;
    return (
        <div
            className={`${page.playerColumn} ${hasSecondLine(view) ? page.detailedNowPlaying : ''}`}
        >
            {!landscape && <DramaHeader title={title} />}
            {current ? (
                <SideRow side={side}>
                    <PlayerGauge
                        art={status === 'unloaded' ? undefined : theme.art}
                        onStart={start}
                        standbyTime={view.standbyTime}
                        bookmark={current}
                        empty={view.empty}
                        {...view.gaugeInfo}
                    />
                </SideRow>
            ) : (
                <StatusMessage message={t('episodes.noneUp')} />
            )}
            {current && landscape && (
                <NowPlaying
                    {...seriesNowPlaying(current, view.arcPosition, view.arcTotal)}
                    status={status}
                    connecting={connecting}
                    notice={view.notice}
                />
            )}
            {/* 已揀短篇嘅資料 sheet：橫版喺唱片嗰欄（docked），直版由畫面底彈出 */}
            <ItemInfoSheet
                open={view.infoSheet.open}
                docked={landscape}
                sections={view.infoSheet.sections}
                banner={view.infoSheet.banner}
                label={t('info.dramaInfo')}
                onClose={view.infoSheet.close}
                returnFocusTo={view.infoSheet.returnFocusTo}
            />
        </div>
    );
};

/**
 * 短篇劇集：直版唱片下面係「現正播放」+ 短篇 chips，揀短篇換下面嘅集數清單（次序同節目頁一樣：
 * 唱片 → 60px 一組 → 清單）。橫版 chips 跟清單喺左欄（頁頭下面），「現正播放」搬去右欄唱片下面；
 * 全集表橫版只蓋左欄（listBody），唔遮播放器
 */
export const SeriesDramaPage = ({ drama }: { drama: DramaConfig }) => {
    // 由「我的收藏」撳行入嚟：唔播、唔開全集表，轉去嗰集個短篇、捲去嗰集
    const focusId = useEpisodeFocus();
    const view = useSeriesDramaPage(drama, focusId);
    const { duration } = usePlayer();
    const landscape = useMediaQuery(LANDSCAPE_LAYOUT_QUERY);
    // Duo 打開・直（P10 lane 5b）：短篇選擇直排喺唱片右邊；冇唱片（冇集數）就照舊喺清單上面（S-1136）
    const pickerSide = useMediaQuery(DUO_OPEN_PORTRAIT_QUERY) && view.upNext !== undefined;
    // 「連線中…」只講呢套劇嘅一集載緊 / 緩衝緊；未載入呢套劇（start 有值）唔講，亦冇 chip 係「播緊」
    const connecting = !view.start && !hasKnownDuration(duration);
    const arcSheet = (
        <SeriesArcSheet sheet={view.sheet} current={view.current} docked={landscape} />
    );
    const column = { view, title: drama.name, landscape, focusKey: view.focusKey };
    const label = arcPickerLabel(connecting, view.upNext, view.status);
    // 讀屏唔讀「·」（S-735）
    const spokenLabel = arcPickerLabel(
        connecting,
        view.upNext,
        view.status,
        t('common.spokenSeparator'),
    );
    const side = pickerSide && (
        <SeriesArcPicker view={view} label={label} spokenLabel={spokenLabel} vertical />
    );
    return (
        <ThemeScope theme={view.theme}>
            <main className={`${page.page} ${page.locked} ${page.fixed}`} data-player-page="">
                <SeriesPlayerColumn {...column} connecting={connecting} side={side} />
                <SeriesListColumn
                    {...column}
                    label={label}
                    spokenLabel={spokenLabel}
                    dockedSheet={landscape && arcSheet}
                    pickerSide={pickerSide}
                />
                {!landscape && arcSheet}
                <InnerPageHandle page={{ kind: 'drama', dramaId: drama.id }} />
            </main>
        </ThemeScope>
    );
};

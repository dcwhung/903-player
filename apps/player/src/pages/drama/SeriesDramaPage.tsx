import type { DramaConfig, SeriesEpisode } from '@903-player/catalog';
import { NowPlaying } from '../../components/shared/player/NowPlaying/NowPlaying';
import { InnerPageHandle } from '../../components/shared/player/InnerPageHandle/InnerPageHandle';
import { PlayerGauge } from '../../components/shared/player/PlayerPanel/PlayerGauge';
import { StatusMessage } from '../../components/shared/common/StatusMessage/StatusMessage';
import { ThemeScope } from '../../components/shared/common/ThemeScope/ThemeScope';
import { LANDSCAPE_QUERY } from '../../config/layout';
import { useEpisodeFocus } from '../../hooks/useEpisodeFocus';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { usePlayer } from '../../player/usePlayer';
import { t } from '../../i18n/t';
import { PLAYBACK_LINE_KEY, type PlaybackLineState } from '../../utils/playbackState';
import { hasKnownDuration } from '../../utils/time';
import { DramaHeader } from './DramaHeader';
import page from '../shared/Page.module.css';
import { SeriesArcSheet, SeriesListColumn } from './SeriesListColumn';
import { useSeriesDramaPage, type SeriesDramaView } from './useDramaPage';

/**
 * 短篇 chips 上面嗰行：未聽過又未載入呢套劇叫用戶揀短篇；載入咗同日子條一樣，未讀到時長講「連線中…」，
 * 否則「現正播放：短篇 · 第 N 集 集名」（暫停講「已暫停：」，載入咗未開始講「下一集：」，
 * 聽過未載入講「繼續收聽：」）
 */
const arcPickerLabel = (
    connecting: boolean,
    current: SeriesEpisode | undefined,
    state: PlaybackLineState,
    sep: string = t('common.separator'),
): string => {
    if (state === 'unloaded') return t(PLAYBACK_LINE_KEY.unloaded);
    if (connecting) return t('episodes.connecting');
    if (!current) return '';
    const episodeNo = t('drama.episodeNo', { no: current.no });
    const episode = current.title
        ? t('drama.nowPlayingShort', { no: current.no, title: current.title, sep })
        : episodeNo;
    const label = t('drama.nowPlayingArcShort', { arc: current.arc, episode, sep });
    return t(PLAYBACK_LINE_KEY[state], { label });
};

/** 橫版唱片下面「現正播放」：短篇加埋第幾個 / 幾多集（按排位，唔係集數），下一行集名 */
const seriesNowPlaying = (current: SeriesEpisode, arcPosition: number, arcTotal: number) => {
    const params = { arc: current.arc, no: arcPosition, total: arcTotal };
    return {
        label: t('drama.nowPlayingArc', params),
        // 讀屏唔讀「·」（S-723）
        spokenLabel: t('drama.nowPlayingArc', { ...params, sep: t('common.spokenSeparator') }),
        detail: current.title,
    };
};

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
    >;
    title: string;
    landscape: boolean;
    connecting: boolean;
}

/**
 * 唱片欄：直版頁頭 + 唱片（未有集數就講冇）；橫版唱片下面加「現正播放」。
 * 未聽過又未載入呢套劇（第一次入未揀短篇）：碟面係冇圖嘅黑碟，同今日冇節目一樣；
 * 聽過未載入：碟面同「繼續收聽」跟撳播放會播嗰集（upNext）
 */
const SeriesPlayerColumn = ({ view, title, landscape, connecting }: SeriesPlayerColumnProps) => {
    const { theme, upNext: current, start, status } = view;
    return (
        <div
            className={`${page.playerColumn} ${hasSecondLine(view) ? page.detailedNowPlaying : ''}`}
        >
            {!landscape && <DramaHeader title={title} />}
            {current ? (
                <PlayerGauge
                    art={status === 'unloaded' ? undefined : theme.art}
                    onStart={start}
                    standbyTime={view.standbyTime}
                    bookmark={current}
                    empty={view.empty}
                />
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
    const focusUrl = useEpisodeFocus();
    const view = useSeriesDramaPage(drama, focusUrl);
    const { duration } = usePlayer();
    const landscape = useMediaQuery(LANDSCAPE_QUERY);
    // 「連線中…」只講呢套劇嘅一集載緊 / 緩衝緊；未載入呢套劇（start 有值）唔講，亦冇 chip 係「播緊」
    const connecting = !view.start && !hasKnownDuration(duration);
    const arcSheet = (
        <SeriesArcSheet sheet={view.sheet} current={view.current} docked={landscape} />
    );
    const column = { view, title: drama.name, landscape, focusKey: focusUrl };
    return (
        <ThemeScope theme={view.theme}>
            <main className={`${page.page} ${page.locked} ${page.fixed}`} data-player-page="">
                <SeriesPlayerColumn {...column} connecting={connecting} />
                <SeriesListColumn
                    {...column}
                    label={arcPickerLabel(connecting, view.upNext, view.status)}
                    // 讀屏唔讀「·」（S-735）
                    spokenLabel={arcPickerLabel(
                        connecting,
                        view.upNext,
                        view.status,
                        t('common.spokenSeparator'),
                    )}
                    dockedSheet={landscape && arcSheet}
                />
                {!landscape && arcSheet}
                <InnerPageHandle page={{ kind: 'drama', dramaId: drama.id }} />
            </main>
        </ThemeScope>
    );
};

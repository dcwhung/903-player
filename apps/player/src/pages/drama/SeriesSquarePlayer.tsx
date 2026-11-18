import { arcLabelOf, type SeriesEpisode } from '@903-player/catalog';
import { SpokenText } from '../../components/shared/common/SpokenText/SpokenText';
import { HourglassIcon } from '../../components/shared/common/icons/icons';
import { StatusMessage } from '../../components/shared/common/StatusMessage/StatusMessage';
import { GaugePanel } from '../../components/shared/player/PlayerPanel/GaugePanel';
import { t, type MessageKey } from '../../i18n/t';
import type { PlaybackLineState } from '../../utils/playbackState';
import page from '../shared/Page.module.css';
import type { SeriesDramaView } from './useDramaPage';

const NOTICE_ICON_SIZE = 12;

/**
 * 短篇名上面嗰行：播緊「現正播放」、暫停「已暫停」、載入咗未開始「下一集」、聽過未載入「繼續收聽」；
 * 揀咗短篇但未載入（播緊其他嘢）都係撳播放會播嗰集，講「下一集」
 */
const STATUS_KEY: Readonly<Record<PlaybackLineState, MessageKey>> = {
    playing: 'episodes.nowPlayingLabel',
    paused: 'common.status.paused',
    ready: 'drama.upNext',
    resume: 'drama.continue',
    unloaded: 'drama.upNext',
};

type TitleView = Pick<SeriesDramaView, 'status' | 'empty' | 'notice'>;

/** 第 N 集 · 集名（冇集名就「第 N 集」）；讀屏唔讀「·」（S-735） */
const episodeLine = (episode: SeriesEpisode, sep: string) =>
    episode.title
        ? t('drama.nowPlayingShort', { no: episode.no, title: episode.title, sep })
        : t('drama.episodeNo', { no: episode.no });

/** 成套劇快將下架（琥珀色 ⏳）：未揀短篇取代「揀一個短篇開始收聽」，播緊短篇取代狀態字 */
const NoticeLine = ({ notice }: { notice: NonNullable<SeriesDramaView['notice']> }) => (
    <p className={`${page.seriesStatus} ${page.seriesNotice}`}>
        <HourglassIcon size={NOTICE_ICON_SIZE} />
        <SpokenText {...notice} />
    </p>
);

/** 未揀短篇：「全集」+「揀一個短篇開始收聽」（_mockups_/home-view 廣播劇頁「未揀短篇」） */
const AllTitle = ({ notice }: Pick<TitleView, 'notice'>) => (
    <>
        <p className={page.seriesTitle}>{t('drama.allArcs')}</p>
        {notice ? (
            <NoticeLine notice={notice} />
        ) : (
            <p className={page.seriesHint}>{t('drama.pickArcToStart')}</p>
        )}
    </>
);

/** 播緊短篇：狀態字 + 短篇名 + 第 N 集 · 集名（「播緊短篇」） */
const ArcTitle = ({
    view,
    episode,
    connecting,
}: {
    view: TitleView;
    episode: SeriesEpisode;
    connecting: boolean;
}) => (
    <>
        {view.notice ? (
            <NoticeLine notice={view.notice} />
        ) : (
            <p className={page.seriesStatus}>
                {connecting ? t('episodes.connecting') : t(STATUS_KEY[view.status])}
            </p>
        )}
        <p className={page.seriesTitle}>{arcLabelOf(episode)}</p>
        <p className={page.seriesDetail}>
            <SpokenText
                text={episodeLine(episode, t('common.separator'))}
                label={episodeLine(episode, t('common.spokenSeparator'))}
            />
        </p>
    </>
);

interface SeriesSquarePlayerProps {
    view: Pick<
        SeriesDramaView,
        'theme' | 'upNext' | 'start' | 'standbyTime' | 'empty' | 'status' | 'notice'
    >;
    connecting: boolean;
}

/**
 * HomeView 廣播劇頁播放器（P10 lane 7b）：同節目頁一樣嘅唱片格（256px 置中），下面貼底係「全集」或者
 * 播緊嗰個短篇 + 集名。未揀短篇（未聽過又未載入）係冇圖黑碟、掣變淡撳唔郁（PlayerGauge empty）
 */
export const SeriesSquarePlayer = ({ view, connecting }: SeriesSquarePlayerProps) => {
    const { upNext, status } = view;
    if (!upNext) return <StatusMessage message={t('episodes.noneUp')} />;
    return (
        <GaugePanel
            art={status === 'unloaded' ? undefined : view.theme.art}
            onStart={view.start}
            standbyTime={view.standbyTime}
            bookmark={upNext}
            empty={view.empty}
        >
            <div className={`${page.squareFooter} ${page.seriesFooter}`} data-series-title="">
                {view.empty ? (
                    <AllTitle notice={view.notice} />
                ) : (
                    <ArcTitle view={view} episode={upNext} connecting={connecting} />
                )}
            </div>
        </GaugePanel>
    );
};

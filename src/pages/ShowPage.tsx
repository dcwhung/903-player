import { useParams } from 'react-router-dom';
import { EpisodeList } from '../components/EpisodeList/EpisodeList';
import { NowPlaying } from '../components/NowPlaying/NowPlaying';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { PlayerPanel } from '../components/PlayerPanel/PlayerPanel';
import { StatusMessage } from '../components/StatusMessage/StatusMessage';
import { ThemeScope } from '../components/ThemeScope/ThemeScope';
import { LANDSCAPE_QUERY } from '../config/layout';
import { useGoHome } from '../hooks/useGoHome';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { t } from '../i18n/t';
import { usePlayer } from '../player/usePlayer';
import { formatDateLabel } from '../utils/date';
import { hasKnownDuration } from '../utils/time';
import { TRANSITION_NAME } from '../utils/viewTransition';
import { LoadState } from './LoadState';
import page from './Page.module.css';
import { useShowPage } from './useShowPage';

type ShowPlayerProps = Pick<
    ReturnType<typeof useShowPage>,
    'theme' | 'current' | 'start' | 'strip' | 'selectEpisode'
> & { title: string; landscape: boolean };

/**
 * 有集數播得就係播放器（橫版下面加「現正播放」，直版喺日子條上面）；
 * 未有就講「未有集數上架」（清單照列出未上架嘅，撳唔到）。
 * 播緊其他嘢（start 有值）：黑碟、未開始樣，撳播放先開始播呢個節目
 */
const ShowPlayer = ({
    title,
    theme,
    current,
    start,
    strip,
    selectEpisode,
    landscape,
}: ShowPlayerProps) => {
    const { duration } = usePlayer();
    if (!current) {
        return <StatusMessage message={t('episodes.noneUp')} />;
    }
    const dateLabel = formatDateLabel(current.date);
    return (
        <>
            <PlayerPanel
                title={title}
                dateLabel={dateLabel}
                art={start ? undefined : theme.art}
                days={strip.days}
                currentDay={strip.current}
                onPick={selectEpisode}
                onStart={start}
                transitionName={TRANSITION_NAME.gauge}
            />
            {landscape && (
                <NowPlaying label={dateLabel} connecting={!start && !hasKnownDuration(duration)} />
            )}
        </>
    );
};

export const ShowPage = () => {
    const { showId = '' } = useParams();
    const goHome = useGoHome();
    const data = useShowPage(showId);
    const { show, theme, status, isSearching, episodeItems } = data;
    const landscape = useMediaQuery(LANDSCAPE_QUERY);

    // 有集數（包括未上架）就列清單
    const listed = show && status === 'ready' && episodeItems.length > 0;
    // 橫版有清單：頁頭喺左欄清單上面；否則（直版 / 未有清單）喺播放器上面
    const headerInList = landscape && listed;
    const header = (
        <div className={page.header}>
            <PageHeader title={show?.name ?? ''} variant="title" onBack={goHome} />
        </div>
    );

    // 成頁固定唔捲，得集數清單自己捲（見 Page.module.css .locked / .fixed）；
    // 節目名喺頁頭（取代「正在播放」），唱片下面變成日子條。
    // 橫版左欄（頁頭 + 集數）、右欄（播放器 + 現正播放）；直版兩欄 display: contents，次序照舊
    return (
        <ThemeScope theme={theme}>
            <main className={`${page.page} ${page.locked} ${page.fixed}`} data-player-page="">
                <div className={page.playerColumn}>
                    {!headerInList && header}
                    {!show ? (
                        <StatusMessage message={t('common.showNotFound')} />
                    ) : (
                        // 乜都冇先講「暫時未有錄音」/ 搵緊；有未上架嘅就由下面講「未有集數上架」
                        <LoadState
                            status={status}
                            isEmpty={episodeItems.length === 0}
                            isSearching={isSearching}
                        />
                    )}
                    {listed && <ShowPlayer {...data} title={show.name} landscape={landscape} />}
                </div>
                {listed && (
                    <div className={page.listColumn}>
                        {headerInList && header}
                        <EpisodeList items={episodeItems} onSelect={data.pressEpisode} />
                    </div>
                )}
            </main>
        </ThemeScope>
    );
};

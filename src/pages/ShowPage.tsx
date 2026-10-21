import { useParams } from 'react-router-dom';
import { EpisodeList } from '../components/EpisodeList/EpisodeList';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { PlayerPanel } from '../components/PlayerPanel/PlayerPanel';
import { StatusMessage } from '../components/StatusMessage/StatusMessage';
import { ThemeScope } from '../components/ThemeScope/ThemeScope';
import { useGoHome } from '../hooks/useGoHome';
import { t } from '../i18n/t';
import { formatDateLabel } from '../utils/date';
import { LoadState } from './LoadState';
import page from './Page.module.css';
import { useShowPage } from './useShowPage';

export const ShowPage = () => {
    const { showId = '' } = useParams();
    const goHome = useGoHome();
    const { show, theme, status, isSearching, current, episodeItems, strip, ...actions } =
        useShowPage(showId);

    const ready = show && status === 'ready' && current;

    // 成頁固定唔捲，得集數清單自己捲（見 Page.module.css .locked / .fixed）；
    // 節目名喺頁頭（取代「正在播放」），唱片下面變成日子條。
    // 橫版左欄（頁頭 + 播放器）、右欄（集數）；直版兩欄 display: contents，次序照舊
    return (
        <ThemeScope theme={theme}>
            <main className={`${page.page} ${page.locked} ${page.fixed}`}>
                <div className={page.playerColumn}>
                    <div className={page.header}>
                        <PageHeader title={show?.name ?? ''} variant="title" onBack={goHome} />
                    </div>
                    {!show ? (
                        <StatusMessage message={t('common.showNotFound')} />
                    ) : (
                        <LoadState status={status} isEmpty={!current} isSearching={isSearching} />
                    )}
                    {ready && (
                        <PlayerPanel
                            title={show.name}
                            dateLabel={formatDateLabel(current.date)}
                            art={theme.art}
                            days={strip.days}
                            currentDay={strip.current}
                            onPick={actions.selectEpisode}
                        />
                    )}
                </div>
                {ready && (
                    <div className={page.listColumn}>
                        <EpisodeList items={episodeItems} onSelect={actions.pressEpisode} />
                    </div>
                )}
            </main>
        </ThemeScope>
    );
};

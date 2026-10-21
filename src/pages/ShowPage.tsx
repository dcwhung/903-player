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

    // 成頁固定唔捲，得集數清單自己捲（見 Page.module.css .locked / .fixed）；
    // 節目名喺頁頭（取代「正在播放」），唱片下面變成日子條
    return (
        <ThemeScope theme={theme}>
            <main className={`${page.page} ${page.locked} ${page.fixed}`}>
                <div className={page.header}>
                    <PageHeader title={show?.name ?? ''} variant="title" onBack={goHome} />
                </div>
                {!show ? (
                    <StatusMessage message={t('common.showNotFound')} />
                ) : (
                    <>
                        {/* 乜都冇先講「暫時未有錄音」/ 搵緊；有未上架嘅就由下面講「未有集數上架」 */}
                        <LoadState
                            status={status}
                            isEmpty={episodeItems.length === 0}
                            isSearching={isSearching}
                        />
                        {/* 有集數播得就有播放器；未有就講「未有集數上架」，照列出未上架嘅（撳唔到） */}
                        {status === 'ready' && episodeItems.length > 0 && (
                            <>
                                {current ? (
                                    <PlayerPanel
                                        title={show.name}
                                        dateLabel={formatDateLabel(current.date)}
                                        art={theme.art}
                                        days={strip.days}
                                        currentDay={strip.current}
                                        onPick={actions.selectEpisode}
                                    />
                                ) : (
                                    <StatusMessage message={t('episodes.noneUp')} />
                                )}
                                <EpisodeList items={episodeItems} onSelect={actions.pressEpisode} />
                            </>
                        )}
                    </>
                )}
            </main>
        </ThemeScope>
    );
};

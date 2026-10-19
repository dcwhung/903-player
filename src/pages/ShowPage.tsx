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
    const { show, theme, status, reload, current, episodeItems, selectEpisode } =
        useShowPage(showId);

    return (
        <ThemeScope theme={theme}>
            <main className={page.page}>
                <div className={page.header}>
                    <PageHeader title={t('player.nowPlaying')} onBack={goHome} />
                </div>
                {!show ? (
                    <StatusMessage message={t('common.showNotFound')} />
                ) : (
                    <>
                        <LoadState status={status} isEmpty={!current} onRetry={reload} />
                        {status === 'ready' && current && (
                            <>
                                <PlayerPanel
                                    title={show.name}
                                    dateLabel={formatDateLabel(current.date)}
                                    art={theme.art}
                                />
                                <EpisodeList items={episodeItems} onSelect={selectEpisode} />
                            </>
                        )}
                    </>
                )}
            </main>
        </ThemeScope>
    );
};

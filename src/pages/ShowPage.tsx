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

type ShowPlayerProps = Pick<
    ReturnType<typeof useShowPage>,
    'theme' | 'current' | 'strip' | 'selectEpisode'
> & { title: string };

/** 有集數播得就係播放器；未有就講「未有集數上架」（下面照列出未上架嘅，撳唔到） */
const ShowPlayer = ({ title, theme, current, strip, selectEpisode }: ShowPlayerProps) => {
    if (!current) {
        return <StatusMessage message={t('episodes.noneUp')} />;
    }
    return (
        <PlayerPanel
            title={title}
            dateLabel={formatDateLabel(current.date)}
            art={theme.art}
            days={strip.days}
            currentDay={strip.current}
            onPick={selectEpisode}
        />
    );
};

export const ShowPage = () => {
    const { showId = '' } = useParams();
    const goHome = useGoHome();
    const data = useShowPage(showId);
    const { show, theme, status, isSearching, episodeItems } = data;

    // 有集數（包括未上架）就列清單
    const listed = show && status === 'ready' && episodeItems.length > 0;

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
                        // 乜都冇先講「暫時未有錄音」/ 搵緊；有未上架嘅就由下面講「未有集數上架」
                        <LoadState
                            status={status}
                            isEmpty={episodeItems.length === 0}
                            isSearching={isSearching}
                        />
                    )}
                    {listed && <ShowPlayer {...data} title={show.name} />}
                </div>
                {listed && (
                    <div className={page.listColumn}>
                        <EpisodeList items={episodeItems} onSelect={data.pressEpisode} />
                    </div>
                )}
            </main>
        </ThemeScope>
    );
};

import { PageHeader } from '../components/PageHeader/PageHeader';
import { PlayerPanel } from '../components/PlayerPanel/PlayerPanel';
import { TodayShowList } from '../components/TodayShowList/TodayShowList';
import { findShow } from '../config/shows';
import { useGoHome } from '../hooks/useGoHome';
import { t } from '../i18n/t';
import { formatDateLabel } from '../utils/date';
import { LoadState } from './LoadState';
import page from './Page.module.css';
import { useTodayPage } from './useTodayPage';

export const TodayPage = () => {
    const goHome = useGoHome();
    const { status, reload, date, current, items, selectShow } = useTodayPage();

    return (
        <main className={page.page}>
            <div className={page.header}>
                <PageHeader title={t('today.title')} onBack={goHome} />
            </div>
            <LoadState status={status} isEmpty={!current} onRetry={reload} />
            {status === 'ready' && current && date && (
                <>
                    <PlayerPanel
                        title={findShow(current.showId)?.name ?? ''}
                        dateLabel={formatDateLabel(date)}
                    />
                    <TodayShowList items={items} onSelect={selectShow} />
                </>
            )}
        </main>
    );
};

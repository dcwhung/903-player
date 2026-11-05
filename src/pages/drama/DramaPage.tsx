import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { StatusMessage } from '../../components/shared/common/StatusMessage/StatusMessage';
import { ThemeScope } from '../../components/shared/common/ThemeScope/ThemeScope';
import { showToast } from '../../components/shared/common/Toast/toastStore';
import { NEUTRAL_THEME } from '../../config/showThemes';
import { dramaStatus, findEnabledDrama } from '../../catalog/dramas';
import { afterSplash } from '../../splash/afterSplash';
import { t } from '../../i18n/t';
import { DailyDramaPage } from './DailyDramaPage';
import { DramaHeader } from './DramaHeader';
import page from '../shared/Page.module.css';
import { SeriesDramaPage } from './SeriesDramaPage';

/**
 * 劇集未上架 / 已下架（舊 URL、書籤）：返主頁；已下架順便出提示
 * （直接開 URL 有啟動畫面，等佢走咗先出，唔係用戶睇唔到）
 */
const OffShelf = ({ removed }: { removed: boolean }) => {
    useEffect(() => {
        // 唔 cancel：呢個 component 一轉頁就 unmount，提示係全 app 嘅，要等到啟動畫面走咗都照出
        if (removed) afterSplash(document, () => showToast(t('availability.dramaRemovedToast')));
    }, [removed]);
    return <Navigate to="/" replace />;
};

/** 劇集頁 route：按劇集款式分派每日 / 短篇劇集頁；搵唔到（或者未開放）就講搵唔到 */
export const DramaPage = () => {
    const { dramaId = '' } = useParams();
    const drama = findEnabledDrama(dramaId);
    const status = dramaStatus(dramaId);
    if (drama && (status === 'upcoming' || status === 'removed'))
        return <OffShelf removed={status === 'removed'} />;
    if (!drama) {
        return (
            <ThemeScope theme={NEUTRAL_THEME}>
                <main className={`${page.page} ${page.locked} ${page.fixed}`}>
                    <DramaHeader title="" />
                    <StatusMessage message={t('drama.notFound')} />
                </main>
            </ThemeScope>
        );
    }
    // key：換劇（同一條 route）時重新入頁，第一次入 / 揀咗嘅短篇等 state 唔會帶過去
    return drama.kind === 'series' ? (
        <SeriesDramaPage key={drama.id} drama={drama} />
    ) : (
        <DailyDramaPage drama={drama} />
    );
};

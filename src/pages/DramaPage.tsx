import { useParams } from 'react-router-dom';
import { StatusMessage } from '../components/StatusMessage/StatusMessage';
import { ThemeScope } from '../components/ThemeScope/ThemeScope';
import { NEUTRAL_THEME } from '../config/showThemes';
import { findEnabledDrama } from '../dramas';
import { t } from '../i18n/t';
import { DailyDramaPage } from './DailyDramaPage';
import { DramaHeader } from './DramaHeader';
import page from './Page.module.css';
import { SeriesDramaPage } from './SeriesDramaPage';

/** 劇集頁 route：按劇集款式分派每日 / 短篇劇集頁；搵唔到（或者未開放）就講搵唔到 */
export const DramaPage = () => {
    const { dramaId = '' } = useParams();
    const drama = findEnabledDrama(dramaId);
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

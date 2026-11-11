/* 廣播劇分頁：基本資料 / 短篇（N）/ 排程（mockup ⑧ .tabs）；保留 ?from=todos */
import { Link, useLocation } from 'react-router-dom';
import { t } from '../../i18n/t';

export type DramaTab = 'basic' | 'arcs' | 'schedule';

const SUFFIX: Record<DramaTab, string> = { basic: '', arcs: '/arcs', schedule: '/schedule' };

export function DramaTabs({ id, tab, arcCount }: { id: string; tab: DramaTab; arcCount: number }) {
    const { search } = useLocation();
    const labels: Record<DramaTab, string> = {
        basic: t('drama.tabBasic'),
        arcs: t('drama.tabArcs', { count: arcCount }),
        schedule: t('drama.tabSchedule'),
    };
    return (
        <nav className="tabs" aria-label={t('drama.tabsLabel')}>
            {(Object.keys(SUFFIX) as DramaTab[]).map((key) => (
                <Link
                    key={key}
                    to={`/dramas/${id}${SUFFIX[key]}${search}`}
                    aria-current={key === tab ? 'page' : undefined}
                >
                    {labels[key]}
                </Link>
            ))}
        </nav>
    );
}

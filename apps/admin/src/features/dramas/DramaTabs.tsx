/*
 * 廣播劇分頁：基本資料 / 短篇（N）/ 排程（mockup ⑧ .tabs）；保留 ?from=todos；
 * 短篇 / 排程連結帶記住嘅短篇（#arc，見 useArcMemory）
 */
import { Link, useLocation } from 'react-router-dom';
import { t } from '../../i18n/t';

export type DramaTab = 'basic' | 'arcs' | 'schedule';

const SUFFIX: Record<DramaTab, string> = { basic: '', arcs: '/arcs', schedule: '/schedule' };

/** 揀短篇嘅 tab：連結帶 #<短篇 ID> */
const ARC_TABS: ReadonlySet<DramaTab> = new Set(['arcs', 'schedule']);

interface DramaTabsProps {
    id: string;
    tab: DramaTab;
    arcCount: number;
    /** 記住嘅短篇 ID；'' = 冇 */
    arc?: string;
}

export function DramaTabs({ id, tab, arcCount, arc = '' }: DramaTabsProps) {
    const hashOf = (key: DramaTab) =>
        arc !== '' && ARC_TABS.has(key) ? `#${encodeURIComponent(arc)}` : '';
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
                    to={`/dramas/${id}${SUFFIX[key]}${search}${hashOf(key)}`}
                    aria-current={key === tab ? 'page' : undefined}
                >
                    {labels[key]}
                </Link>
            ))}
        </nav>
    );
}

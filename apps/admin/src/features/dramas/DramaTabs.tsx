/*
 * 廣播劇分頁：基本資料 / 短篇（N）/ 排程 / 配色（mockup ⑧ .tabs；配色：mockup admin-phase4 #d）；保留 ?from=todos；
 * 短篇 / 排程連結帶記住嘅短篇（#arc，見 useArcMemory）
 */
import { Link, useLocation } from 'react-router-dom';
import { t } from '../../i18n/t';
import { dramaEditorPath } from '../../model/paths';

export type DramaTab = 'basic' | 'arcs' | 'schedule' | 'theme';

const SUFFIX: Record<DramaTab, string> = {
    basic: '',
    arcs: '/arcs',
    schedule: '/schedule',
    theme: '/theme',
};

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
        theme: t('drama.tabTheme'),
    };
    return (
        <nav className="tabs" aria-label={t('drama.tabsLabel')}>
            {(Object.keys(SUFFIX) as DramaTab[]).map((key) => (
                <Link
                    key={key}
                    to={`${dramaEditorPath(id)}${SUFFIX[key]}${search}${hashOf(key)}`}
                    aria-current={key === tab ? 'page' : undefined}
                >
                    {labels[key]}
                </Link>
            ))}
        </nav>
    );
}

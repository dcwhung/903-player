import type { HomeTab } from '../../hooks/useHomeTab';
import { t } from '../../i18n/t';
import styles from './HomeTabs.module.css';

interface HomeTabsProps {
    tab: HomeTab;
    onChange: (tab: HomeTab) => void;
}

const TABS: readonly { id: HomeTab; label: 'home.tabShows' | 'home.tabDramas' }[] = [
    { id: 'shows', label: 'home.tabShows' },
    { id: 'dramas', label: 'home.tabDramas' },
];

/** 主頁橫額下面嘅分類切換（segmented control）：節目 / 廣播劇 */
export const HomeTabs = ({ tab, onChange }: HomeTabsProps) => (
    <div className={styles.wrap}>
        <div className={styles.tabs} role="group" aria-label={t('home.tabs')}>
            {TABS.map(({ id, label }) => (
                <button
                    key={id}
                    type="button"
                    className={styles.tab}
                    aria-pressed={tab === id}
                    onClick={() => onChange(id)}
                >
                    {t(label)}
                </button>
            ))}
        </div>
    </div>
);

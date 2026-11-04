import type { HomeTab } from '../../../../hooks/useHomeTab';
import { t } from '../../../../i18n/t';
import styles from './HomeTabs.module.css';
import { useTabDirection } from './useTabDirection';

interface HomeTabsProps {
    tab: HomeTab;
    onChange: (tab: HomeTab) => void;
}

const TABS: readonly { id: HomeTab; label: 'home.tabShows' | 'home.tabDramas' }[] = [
    { id: 'shows', label: 'home.tabShows' },
    { id: 'dramas', label: 'home.tabDramas' },
];

/** 由左至右嘅次序：計膠囊向邊邊郁 */
const ORDER: readonly HomeTab[] = TABS.map(({ id }) => id);

/**
 * 主頁橫額下面嘅分類切換（segmented control）：節目 / 廣播劇。
 * 揀中嗰邊由一粒共用膠囊墊底（_mockups_/elastic-tabs E2 拉長），唔再由掣自己塗底色
 */
export const HomeTabs = ({ tab, onChange }: HomeTabsProps) => {
    const direction = useTabDirection(tab, ORDER);
    return (
        <div className={styles.wrap}>
            <div className={styles.tabs} role="group" aria-label={t('home.tabs')}>
                <span
                    className={styles.pill}
                    data-home-tab-pill=""
                    data-tab={tab}
                    data-direction={direction}
                    aria-hidden="true"
                />
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
};

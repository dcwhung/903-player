import type { HomeTab } from '../../../../hooks/useHomeTab';
import { t } from '../../../../i18n/t';
import { StarIcon } from '../../../shared/common/icons/icons';
import styles from './HomeTabs.module.css';
import { useTabDirection } from './useTabDirection';

interface HomeTabsProps {
    tab: HomeTab;
    onChange: (tab: HomeTab) => void;
    /** 有收藏先出第三個 tab（我的收藏，淨係 ★） */
    hasSaved?: boolean;
}

const TABS: readonly {
    id: Exclude<HomeTab, 'saved'>;
    label: 'home.tabShows' | 'home.tabDramas';
}[] = [
    { id: 'shows', label: 'home.tabShows' },
    { id: 'dramas', label: 'home.tabDramas' },
];

/** 由左至右嘅次序：計膠囊向邊邊郁 */
const ORDER: readonly HomeTab[] = [...TABS.map(({ id }) => id), 'saved'];

/** ★ icon 跟 tab 字大細（--font-size-sm）放大 1.6 倍（_mockups_/bookmark .tab.icon svg） */
const SAVED_ICON_SIZE = 21;

interface SavedTabProps {
    pressed: boolean;
    gone: boolean;
    onPress: () => void;
}

/**
 * 我的收藏 tab：一直掛住（出現 / 消失要郁闊度 + 淡入淡出），冇收藏時收埋：
 * 闊度 0、aria-hidden + inert（Tab / 讀屏都入唔到）
 */
const SavedTab = ({ pressed, gone, onPress }: SavedTabProps) => (
    <button
        type="button"
        className={`${styles.tab} ${styles.icon}`}
        data-tab-id="saved"
        data-gone={String(gone)}
        aria-hidden={gone || undefined}
        inert={gone}
        aria-label={t('home.tabSaved')}
        aria-pressed={pressed}
        onClick={onPress}
    >
        <StarIcon size={SAVED_ICON_SIZE} filled />
    </button>
);

/**
 * 主頁橫額下面嘅分類切換（segmented control）：節目 / 廣播劇（/ 有收藏先出嘅 ★ 我的收藏）。
 * 揀中嗰邊由一粒共用膠囊墊底（_mockups_/elastic-tabs E2 拉長），唔再由掣自己塗底色
 */
export const HomeTabs = ({ tab, onChange, hasSaved = false }: HomeTabsProps) => {
    const direction = useTabDirection(tab, ORDER);
    return (
        <div className={styles.wrap}>
            <div
                className={styles.tabs}
                role="group"
                aria-label={t('home.tabs')}
                data-saved={String(hasSaved)}
            >
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
                <SavedTab
                    pressed={tab === 'saved'}
                    gone={!hasSaved}
                    onPress={() => onChange('saved')}
                />
            </div>
        </div>
    );
};

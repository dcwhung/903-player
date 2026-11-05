import type { HomeTab } from '../../../../hooks/useHomeTab';
import { t } from '../../../../i18n/t';
import type { ThirdTab } from '../../../../selectors/bookmarks';
import { HistoryIcon, StarIcon } from '../../../shared/common/icons/icons';
import styles from './HomeTabs.module.css';
import { useTabDirection } from './useTabDirection';

interface HomeTabsProps {
    tab: HomeTab;
    onChange: (tab: HomeTab) => void;
    /**
     * 第三個 tab：saved = ★ 我的收藏；recent = 冇收藏、有收聽記錄，歷史 icon「最近收聽」；
     * null = 兩樣都冇，唔出（thirdTabOf）
     */
    third?: ThirdTab | null;
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

/** ★ / 歷史 icon 跟 tab 字大細（--font-size-sm）放大 1.6 倍（_mockups_/bookmark .tab.icon svg） */
const SAVED_ICON_SIZE = 21;

interface SavedTabProps {
    pressed: boolean;
    third: ThirdTab | null;
    onPress: () => void;
}

/**
 * 第三個 tab：一直掛住（出現 / 消失要郁闊度 + 淡入淡出），兩樣都冇時收埋：
 * 闊度 0、aria-hidden + inert（Tab / 讀屏都入唔到）。
 * ★ 同歷史 icon 疊喺同一格（_mockups_/qr-transfer ①）：收藏由有變冇 / 冇變有，
 * 一個縮細轉走、一個轉入（CSS transition），膠囊留喺第三格唔郁
 */
const SavedTab = ({ pressed, third, onPress }: SavedTabProps) => {
    const gone = third === null;
    const recent = third === 'recent';
    return (
        <button
            type="button"
            className={`${styles.tab} ${styles.icon}`}
            data-tab-id="saved"
            data-gone={String(gone)}
            aria-hidden={gone || undefined}
            inert={gone}
            aria-label={t(recent ? 'home.tabRecent' : 'home.tabSaved')}
            aria-pressed={pressed}
            onClick={onPress}
        >
            <span className={styles.ico} data-tab-icon="star" data-on={String(!recent)}>
                <StarIcon size={SAVED_ICON_SIZE} filled />
            </span>
            <span className={styles.ico} data-tab-icon="history" data-on={String(recent)}>
                <HistoryIcon size={SAVED_ICON_SIZE} />
            </span>
        </button>
    );
};

/**
 * 主頁橫額下面嘅分類切換（segmented control）：節目 / 廣播劇（/ 第三個 tab：★ 我的收藏或者歷史 icon 最近收聽）。
 * 揀中嗰邊由一粒共用膠囊墊底（_mockups_/elastic-tabs E2 拉長），唔再由掣自己塗底色
 */
export const HomeTabs = ({ tab, onChange, third = null }: HomeTabsProps) => {
    const direction = useTabDirection(tab, ORDER);
    return (
        <div className={styles.wrap}>
            <div
                className={styles.tabs}
                role="group"
                aria-label={t('home.tabs')}
                data-saved={String(third !== null)}
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
                    third={third}
                    onPress={() => onChange('saved')}
                />
            </div>
        </div>
    );
};

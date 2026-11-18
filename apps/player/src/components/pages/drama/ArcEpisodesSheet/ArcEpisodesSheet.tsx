import type { RefObject } from 'react';
import { t } from '../../../../i18n/t';
import type { InfoBanner as InfoBannerData } from '../../../../selectors/itemInfo';
import { BulletListIcon } from '../../../shared/common/icons/icons';
import { ListSheet } from '../../../shared/common/ListSheet/ListSheet';
import {
    EpisodeList,
    episodeCountText,
    type EpisodeItem,
} from '../../../shared/player/EpisodeList/EpisodeList';
import styles from './ArcEpisodesSheet.module.css';

const ALL_ICON_SIZE = 16;

interface ArcEpisodesSheetProps {
    open: boolean;
    onClose: () => void;
    /** 頂部橫額：劇集橫額 + 短篇名 +「劇名 · 聽緊第 N 集」（同全集表頂一樣位置） */
    banner: InfoBannerData | undefined;
    /** 嗰個短篇嘅集數（集名做行名，照集數次序） */
    items: EpisodeItem[];
    onSelect: (url: string) => void;
    /** 由「我的收藏」撳入嚟嗰集（捲過去、highlight） */
    focusKey: string | undefined;
    /** 右上「全集」：換返全集表，揀第二個短篇 */
    onShowAll: () => void;
    /** 自動開（冇撳過掣）閂咗焦點返頁頭清單掣（鍵盤閂先搬，useSheetBehaviour） */
    returnFocusTo: RefObject<HTMLElement | null>;
}

/** 短篇劇集嘅集數清單：行名用集名，入頁捲到播緊嗰集（同直版清單一樣，SeriesListColumn SERIES_LIST） */
const SERIES_LIST = { labels: 'title', scrollAlign: 'top' } as const;

/**
 * 短篇表（HomeView 廣播劇頁播緊短篇，P10 lane 7b，_mockups_/home-view 廣播劇頁「播緊短篇」/ S8）：
 * 頂部同全集表一樣有橫額（短篇名 + 資料），下面係嗰個短篇嘅集數；表頭右邊「全集」掣換返全集表。
 * 開閂、拉走、焦點、減少動態全部同其他清單 sheet 一樣（ListSheet）
 */
export const ArcEpisodesSheet = ({
    open,
    onClose,
    banner,
    items,
    onSelect,
    focusKey,
    onShowAll,
    returnFocusTo,
}: ArcEpisodesSheetProps) => (
    <ListSheet
        open={open}
        onClose={onClose}
        title={t('episodes.title')}
        summary={episodeCountText(items)}
        returnFocusTo={returnFocusTo}
        banner={banner}
        action={
            <button type="button" className={styles.all} aria-haspopup="dialog" onClick={onShowAll}>
                <span className={styles.pill}>
                    <BulletListIcon size={ALL_ICON_SIZE} />
                    {t('drama.allArcs')}
                </span>
            </button>
        }
    >
        <EpisodeList
            items={items}
            onSelect={onSelect}
            focusKey={focusKey}
            heading={false}
            {...SERIES_LIST}
        />
    </ListSheet>
);

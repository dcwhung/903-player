import { useId } from 'react';
import { t } from '../../../../i18n/t';
import { Disc } from '../../../shared/common/Disc/Disc';
import { BookmarkButton } from '../../../shared/player/BookmarkButton/BookmarkButton';
import { zoomKey } from '../../../../utils/cardZoom';
import styles from './SavedTab.module.css';
import type { RecentRowView } from './savedTypes';

/** 最近收聽一行：細碟 + 名 + 日期 / 集數；撳行 = 入嗰集（唔播），撳 ☆ = 收藏 */
const RecentRow = ({ row }: { row: RecentRowView }) => {
    // 讀屏名用讀屏版日子（17/10 星期六），畫面照顯示 row.label
    const { name, spokenLabel: label } = row;
    return (
        <li className={styles.recentRow} data-zoom-key={zoomKey.episode(row.key)}>
            <button
                type="button"
                className={styles.recentOpen}
                aria-label={t('bookmark.openRecent', { name, label })}
                onClick={row.onOpen}
            >
                <span className={styles.recentDisc}>
                    <Disc size="fill" art={row.art} />
                </span>
                <span className={styles.recentText}>
                    <span className={styles.recentName}>{name}</span>
                    <span className={styles.recentLabel}>{row.label}</span>
                </span>
            </button>
            <BookmarkButton
                track={row.track}
                label={t('bookmark.bookmarkRecent', { name, label })}
                className={styles.recentStar}
            />
        </li>
    );
};

interface RecentPanelProps {
    rows: readonly RecentRowView[];
    /** 冇收藏版：佔滿成個 tab 區（_mockups_/qr-transfer ②），唔係固定高 / 闊 */
    fill?: boolean;
    /** 清單分幾欄（冇收藏版：recentColumns）；有收藏版一欄 */
    columns?: number;
}

/**
 * 「最近收聽」（E2）：有收聽記錄先出，有收藏時固定位置（直版底、窄橫版最右、闊橫版左邊最底）；
 * 冇收藏時佔滿成個 tab（fill）。最多 10 集，panel 入面自己捲
 */
export const RecentPanel = ({ rows, fill = false, columns = 1 }: RecentPanelProps) => {
    const headingId = useId();
    return (
        <section className={styles.recent} data-fill={String(fill)} aria-labelledby={headingId}>
            <h2 id={headingId} className={styles.recentTitle}>
                {t('bookmark.recent')}
            </h2>
            {/* 捲動喺外層、ul 高度跟內容：分欄先唔會溢出去右邊（W-535） */}
            <div className={styles.recentScroll}>
                <ul className={styles.recentList} style={{ columnCount: columns }}>
                    {rows.map((row) => (
                        <RecentRow key={row.key} row={row} />
                    ))}
                </ul>
            </div>
        </section>
    );
};

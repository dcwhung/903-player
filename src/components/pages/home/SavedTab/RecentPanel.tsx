import { useId } from 'react';
import { t } from '../../../../i18n/t';
import { Disc } from '../../../shared/common/Disc/Disc';
import { BookmarkButton } from '../../../shared/player/BookmarkButton/BookmarkButton';
import { zoomKey } from '../../../../utils/cardZoom';
import styles from './SavedTab.module.css';
import type { RecentRowView } from './savedTypes';

/** 最近收聽一行：細碟 + 名 + 日期 / 集數；撳行 = 入嗰集（唔播），撳 ☆ = 收藏 */
const RecentRow = ({ row }: { row: RecentRowView }) => {
    const { name, label } = row;
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
                    <span>{label}</span>
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

/**
 * 「最近收聽」（E2）：有收聽記錄先出，固定位置（直版底、窄橫版最右、闊橫版左邊最底），
 * 最多 10 集，panel 入面自己捲
 */
export const RecentPanel = ({ rows }: { rows: readonly RecentRowView[] }) => {
    const headingId = useId();
    return (
        <section className={styles.recent} aria-labelledby={headingId}>
            <h2 id={headingId} className={styles.recentTitle}>
                {t('bookmark.recent')}
            </h2>
            <ul className={styles.recentList}>
                {rows.map((row) => (
                    <RecentRow key={row.key} row={row} />
                ))}
            </ul>
        </section>
    );
};

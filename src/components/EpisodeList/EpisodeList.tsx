import { useId, useRef } from 'react';
import { t } from '../../i18n/t';
import styles from './EpisodeList.module.css';
import { EpisodeRow } from './EpisodeRow';
import type { EpisodeItem, EpisodeLabels, EpisodeScrollAlign } from './episodeListTypes';
import { useScrollToCurrent } from './useScrollToCurrent';

// 型別喺 episodeListTypes（EpisodeRow 都用，免循環）；re-export 令 pages/ 舊 import 路徑照用
export type { EpisodeItem, EpisodeLabels, EpisodeScrollAlign } from './episodeListTypes';

interface EpisodeListProps {
    items: EpisodeItem[];
    onSelect: (key: string) => void;
    labels?: EpisodeLabels;
    scrollAlign?: EpisodeScrollAlign;
}

/** 標題右邊：「共 N 集」只計播得到嘅；有未上架就加埋幾多集 */
const countText = (items: EpisodeItem[]): string => {
    const unavailable = items.filter((item) => item.status.kind === 'unavailable').length;
    const count = items.length - unavailable;
    return unavailable > 0
        ? t('episodes.countWithUnavailable', { count, unavailable })
        : t('episodes.count', { count });
};

/**
 * 集數清單：最新喺頂（節目頁）/ 照集數次序（短篇劇集），每集有進度同狀態。
 * 清單本身係頁面唯一捲動嘅 panel
 */
export const EpisodeList = ({
    items,
    onSelect,
    labels = 'date',
    scrollAlign = 'nearest',
}: EpisodeListProps) => {
    const headingId = useId();
    const listRef = useRef<HTMLUListElement>(null);
    useScrollToCurrent(listRef, items, scrollAlign);

    return (
        <section className={styles.section} aria-labelledby={headingId} data-labels={labels}>
            <div className={styles.header}>
                <h2 id={headingId} className={styles.heading}>
                    {t('episodes.title')}
                </h2>
                <span>{countText(items)}</span>
            </div>
            <ul ref={listRef} className={styles.list}>
                {items.map((item) => (
                    <li key={item.key}>
                        <EpisodeRow item={item} onSelect={onSelect} />
                    </li>
                ))}
            </ul>
        </section>
    );
};

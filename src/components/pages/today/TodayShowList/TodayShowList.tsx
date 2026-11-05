import { useId } from 'react';
import { t, type MessageKey } from '../../../../i18n/t';
import type { Recording } from '../../../../types/recording';
import { Disc } from '../../../shared/common/Disc/Disc';
import { CheckIcon, PauseIcon, PlayIcon } from '../../../shared/common/icons/icons';
import { Marquee } from '../../../shared/common/Marquee/Marquee';
import { BookmarkButton } from '../../../shared/player/BookmarkButton/BookmarkButton';
import styles from './TodayShowList.module.css';

export type ShowStatus = 'playing' | 'watched' | 'unwatched' | 'unavailable';

export interface TodayShowItem {
    key: string;
    name: string;
    /** 播出時間 HH:MM */
    time: string;
    art: string;
    status: ShowStatus;
    active: boolean;
    /** 呢個節目今日嗰集：有就喺播放掣左邊出收藏掣（P7 #7）；未上架冇 */
    track?: Recording;
}

interface TodayShowListProps {
    items: TodayShowItem[];
    onSelect: (key: string) => void;
}

const STATUS_MESSAGE: Record<ShowStatus, MessageKey> = {
    playing: 'today.statusPlaying',
    watched: 'today.statusWatched',
    unwatched: 'today.statusUnwatched',
    unavailable: 'today.statusUnavailable',
};
const STATUS_ICON_SIZE = 12;
const PLAY_ICON_SIZE = 22;

/**
 * 未上架：照列出節目同時間，但唔係掣（撳唔到、冇播放掣），唱片同節目名變淡。
 * 用普通 div：screen reader 直接讀可見文字（節目名、時間 · 未上架），唔會當成停用咗嘅掣
 */
const UnavailableRow = ({ item }: { item: TodayShowItem }) => (
    <div className={`${styles.item} ${styles.unavailable}`}>
        <span className={styles.art}>
            <Disc size="small" art={item.art} />
        </span>
        <span className={styles.text}>
            <Marquee className={styles.name} text={item.name} />
            <span className={styles.status}>
                {t('today.timeWithStatus', {
                    time: item.time,
                    status: t(STATUS_MESSAGE.unavailable),
                })}
            </span>
        </span>
    </div>
);

const ShowRow = ({ item, onSelect }: { item: TodayShowItem; onSelect: (key: string) => void }) => {
    if (item.status === 'unavailable') {
        return <UnavailableRow item={item} />;
    }
    const statusText = t(STATUS_MESSAGE[item.status]);
    // 播緊（status playing = 揀中 + 播放中）：掣變暫停，撳落去暫停
    const isPlaying = item.status === 'playing';
    // 收藏掣唔可以放入行掣入面：行入面留位，星疊喺個位上面（同一個 li）
    return (
        <>
            <button
                type="button"
                className={`${styles.item} ${item.active ? styles.active : ''}`}
                aria-current={item.active ? 'true' : undefined}
                aria-label={t(
                    isPlaying ? 'today.pauseShowWithStatus' : 'today.playShowWithStatus',
                    {
                        name: item.name,
                        status: statusText,
                    },
                )}
                onClick={() => onSelect(item.key)}
            >
                <Disc size="small" art={item.art} />
                <span className={styles.text}>
                    <Marquee className={styles.name} text={item.name} />
                    <span className={`${styles.status} ${styles[item.status] ?? ''}`}>
                        {item.status === 'watched' && <CheckIcon size={STATUS_ICON_SIZE} />}
                        {t('today.timeWithStatus', { time: item.time, status: statusText })}
                    </span>
                </span>
                {item.track && <span className={styles.bookmarkSpace} aria-hidden="true" />}
                {isPlaying ? (
                    <PauseIcon size={PLAY_ICON_SIZE} />
                ) : (
                    <PlayIcon size={PLAY_ICON_SIZE} filled={false} />
                )}
            </button>
            {item.track && (
                <BookmarkButton
                    track={item.track}
                    label={t('bookmark.toggleEpisode', { label: item.name })}
                    className={styles.bookmark}
                />
            )}
        </>
    );
};

export const TodayShowList = ({ items, onSelect }: TodayShowListProps) => {
    const headingId = useId();
    const unavailable = items.filter((item) => item.status === 'unavailable').length;
    return (
        <section className={styles.section} aria-labelledby={headingId}>
            <div className={styles.header}>
                <h2 id={headingId} className={styles.heading}>
                    {t('today.listTitle')}
                </h2>
                {unavailable > 0 && (
                    <span>{t('today.unavailableCount', { count: unavailable })}</span>
                )}
            </div>
            <ul className={styles.list}>
                {items.map((item) => (
                    <li key={item.key} className={styles.row}>
                        <ShowRow item={item} onSelect={onSelect} />
                    </li>
                ))}
            </ul>
        </section>
    );
};

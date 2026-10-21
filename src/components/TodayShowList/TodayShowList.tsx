import { useId } from 'react';
import { t, type MessageKey } from '../../i18n/t';
import { Disc } from '../Disc/Disc';
import { CheckIcon, PauseIcon, PlayIcon } from '../icons/icons';
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
            <span className={styles.name}>{item.name}</span>
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
    return (
        <button
            type="button"
            className={`${styles.item} ${item.active ? styles.active : ''}`}
            aria-current={item.active ? 'true' : undefined}
            aria-label={t(isPlaying ? 'today.pauseShowWithStatus' : 'today.playShowWithStatus', {
                name: item.name,
                status: statusText,
            })}
            onClick={() => onSelect(item.key)}
        >
            <Disc size="small" art={item.art} />
            <span className={styles.text}>
                <span className={styles.name}>{item.name}</span>
                <span className={`${styles.status} ${styles[item.status] ?? ''}`}>
                    {item.status === 'watched' && <CheckIcon size={STATUS_ICON_SIZE} />}
                    {t('today.timeWithStatus', { time: item.time, status: statusText })}
                </span>
            </span>
            {isPlaying ? (
                <PauseIcon size={PLAY_ICON_SIZE} />
            ) : (
                <PlayIcon size={PLAY_ICON_SIZE} filled={false} />
            )}
        </button>
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
                    <li key={item.key}>
                        <ShowRow item={item} onSelect={onSelect} />
                    </li>
                ))}
            </ul>
        </section>
    );
};

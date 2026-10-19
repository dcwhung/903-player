import { useEffect, useId, useRef } from 'react';
import { t } from '../../i18n/t';
import { scrollBehavior } from '../../utils/motion';
import { PERCENT, toPercent } from '../../utils/ratio';
import { scrollRowIntoPanel } from '../../utils/scroll';
import { CheckIcon, PlayIcon } from '../icons/icons';
import styles from './EpisodeList.module.css';
import type { EpisodeStatus } from './episodeStatus';

export interface EpisodeItem {
    key: string;
    dayMonth: string;
    weekday: string;
    current: boolean;
    status: EpisodeStatus;
}

interface EpisodeListProps {
    items: EpisodeItem[];
    onSelect: (key: string) => void;
}

const CHECK_ICON_SIZE = 12;
const PLAY_ICON_SIZE = 22;

const EpisodeRow = ({ item, onSelect }: { item: EpisodeItem; onSelect: (key: string) => void }) => {
    const { status } = item;
    const percent = toPercent(status.ratio);
    const date = `${item.dayMonth} ${item.weekday}`;
    return (
        <button
            type="button"
            className={`${styles.row} ${item.current ? styles.current : ''} ${styles[status.kind] ?? ''}`}
            aria-current={item.current ? 'true' : undefined}
            aria-label={t('episodes.play', { date, status: status.text })}
            onClick={() => onSelect(item.key)}
        >
            <span className={styles.date}>
                <span className={styles.dayMonth}>{item.dayMonth}</span>
                <span className={styles.weekday}>{item.weekday}</span>
            </span>
            <span className={styles.body}>
                <span
                    className={styles.bar}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={PERCENT}
                    aria-valuenow={percent}
                >
                    <span className={styles.fill} style={{ width: `${percent}%` }} />
                </span>
                <span className={styles.status}>{status.text}</span>
            </span>
            {status.kind === 'watched' ? (
                <span className={styles.check} role="img" aria-label={t('episodes.watched')}>
                    <CheckIcon size={CHECK_ICON_SIZE} />
                </span>
            ) : (
                <PlayIcon className={styles.play} size={PLAY_ICON_SIZE} filled={false} />
            )}
        </button>
    );
};

/**
 * 集數清單：最新喺頂，每集有進度同狀態。
 * 清單本身係節目頁唯一捲動嘅 panel；入頁 / 轉集時只喺 panel 入面捲到揀中嗰集
 */
export const EpisodeList = ({ items, onSelect }: EpisodeListProps) => {
    const headingId = useId();
    const listRef = useRef<HTMLUListElement>(null);
    const currentKey = items.find((item) => item.current)?.key;

    useEffect(() => {
        const list = listRef.current;
        const row = list?.querySelector('[aria-current="true"]');
        if (list && row) scrollRowIntoPanel(list, row, scrollBehavior());
    }, [currentKey]);

    return (
        <section className={styles.section} aria-labelledby={headingId}>
            <div className={styles.header}>
                <h2 id={headingId} className={styles.heading}>
                    {t('episodes.title')}
                </h2>
                <span>{t('episodes.count', { count: items.length })}</span>
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

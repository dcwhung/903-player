import { useEffect, useId, useRef } from 'react';
import { t } from '../../i18n/t';
import { scrollBehavior } from '../../utils/motion';
import { PERCENT, toPercent } from '../../utils/ratio';
import { scrollRowIntoPanel } from '../../utils/scroll';
import { CheckIcon, PauseIcon, PlayIcon } from '../icons/icons';
import styles from './EpisodeList.module.css';
import type { EpisodeStatus } from './episodeStatus';

export interface EpisodeItem {
    key: string;
    /** 大字（節目：日/月；主題劇集：集名） */
    dayMonth: string;
    /** 細字（節目：星期幾；主題劇集：第 N 集） */
    weekday: string;
    /** 細字旁邊嘅標籤（例如每日劇集重播「重溫」）；冇就唔顯示 */
    tag?: string;
    current: boolean;
    /** 揀中而且播緊：掣變暫停，撳落去暫停 */
    isPlaying: boolean;
    status: EpisodeStatus;
}

/**
 * 行頭欄闊（成個清單一樣，進度條先對齊）：date 節目日子；taggedDate 日子加「重溫」標籤；
 * title 主題劇集集名（長短唔一）
 */
export type EpisodeLabels = 'date' | 'taggedDate' | 'title';

interface EpisodeListProps {
    items: EpisodeItem[];
    onSelect: (key: string) => void;
    labels?: EpisodeLabels;
}

const CHECK_ICON_SIZE = 12;
const PLAY_ICON_SIZE = 22;

/** 行尾圖示：播緊 → 暫停；聽過 → 剔；其他 → 播放 */
const RowIcon = ({ item }: { item: EpisodeItem }) => {
    if (item.isPlaying) {
        return <PauseIcon className={styles.play} size={PLAY_ICON_SIZE} />;
    }
    if (item.status.kind === 'watched') {
        return (
            <span className={styles.check} role="img" aria-label={t('episodes.watched')}>
                <CheckIcon size={CHECK_ICON_SIZE} />
            </span>
        );
    }
    return <PlayIcon className={styles.play} size={PLAY_ICON_SIZE} filled={false} />;
};

/** 行頭：大字 + 細字（+ 標籤） */
const RowDate = ({ item }: { item: EpisodeItem }) => (
    <span className={styles.date}>
        <span className={styles.dayMonth}>{item.dayMonth}</span>
        <span className={styles.weekday}>
            {item.weekday}
            {item.tag && <span className={styles.tag}>{item.tag}</span>}
        </span>
    </span>
);

/**
 * 未上架：照列出日子同狀態，但唔係掣（撳唔到、冇播放掣、進度條變虛線）。
 * 用普通 div：screen reader 直接讀可見文字（日子、星期、未上架），唔會當成停用咗嘅掣
 */
const UnavailableRow = ({ item }: { item: EpisodeItem }) => (
    <div className={`${styles.row} ${styles.unavailable}`}>
        <RowDate item={item} />
        <span className={styles.body}>
            <span className={styles.bar} aria-hidden="true" />
            <span className={styles.status}>{item.status.text}</span>
        </span>
    </div>
);

const EpisodeRow = ({ item, onSelect }: { item: EpisodeItem; onSelect: (key: string) => void }) => {
    const { status } = item;
    if (status.kind === 'unavailable') {
        return <UnavailableRow item={item} />;
    }
    const percent = toPercent(status.ratio);
    const date = [item.dayMonth, item.weekday, item.tag].filter(Boolean).join(' ');
    return (
        <button
            type="button"
            className={`${styles.row} ${item.current ? styles.current : ''} ${styles[status.kind] ?? ''}`}
            aria-current={item.current ? 'true' : undefined}
            aria-label={t(item.isPlaying ? 'episodes.pause' : 'episodes.play', {
                date,
                status: status.text,
            })}
            onClick={() => onSelect(item.key)}
        >
            <RowDate item={item} />
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
            <RowIcon item={item} />
        </button>
    );
};

/** 標題右邊：「共 N 集」只計播得到嘅；有未上架就加埋幾多集 */
const countText = (items: EpisodeItem[]): string => {
    const unavailable = items.filter((item) => item.status.kind === 'unavailable').length;
    const count = items.length - unavailable;
    return unavailable > 0
        ? t('episodes.countWithUnavailable', { count, unavailable })
        : t('episodes.count', { count });
};

/**
 * 集數清單：最新喺頂，每集有進度同狀態。
 * 清單本身係節目頁唯一捲動嘅 panel；入頁 / 轉集時只喺 panel 入面捲到揀中嗰集
 */
export const EpisodeList = ({ items, onSelect, labels = 'date' }: EpisodeListProps) => {
    const headingId = useId();
    const listRef = useRef<HTMLUListElement>(null);
    const currentKey = items.find((item) => item.current)?.key;

    useEffect(() => {
        const list = listRef.current;
        const row = list?.querySelector('[aria-current="true"]');
        if (list && row) scrollRowIntoPanel(list, row, scrollBehavior());
    }, [currentKey]);

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

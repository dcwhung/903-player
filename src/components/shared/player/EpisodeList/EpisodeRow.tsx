import { t } from '../../../../i18n/t';
import { PERCENT, toPercent } from '../../../../utils/ratio';
import { CheckIcon, ClockIcon, HourglassIcon, PauseIcon, PlayIcon } from '../../common/icons/icons';
import { Marquee } from '../../common/Marquee/Marquee';
import { Separator } from '../../common/Separator/Separator';
import { BookmarkButton } from '../BookmarkButton/BookmarkButton';
import styles from './EpisodeList.module.css';
import type { EpisodeItem } from './episodeListTypes';

const CHECK_ICON_SIZE = 12;
const PLAY_ICON_SIZE = 22;
const NOTICE_ICON_SIZE = 12;
const CLOCK_ICON_SIZE = 18;

/** 行尾圖示：播緊 → 暫停；聽過 → 剔；其他 → 播放 */
const RowIcon = ({ item }: { item: EpisodeItem }) => {
    if (item.isPlaying) {
        return <PauseIcon className={styles.play} size={PLAY_ICON_SIZE} />;
    }
    if (item.status.kind === 'watched') {
        return (
            <span className={styles.check} role="img" aria-label={t('common.status.watched')}>
                <CheckIcon size={CHECK_ICON_SIZE} />
            </span>
        );
    }
    return <PlayIcon className={styles.play} size={PLAY_ICON_SIZE} filled={false} />;
};

/** 行頭：大字（集名太長：揀中嗰行跑馬燈，其他行 … 收尾）+ 細字（+ 標籤） */
const RowDate = ({ item }: { item: EpisodeItem }) => (
    <span className={styles.date}>
        <Marquee className={styles.dayMonth} text={item.dayMonth} animate={item.isPlaying} />
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

/**
 * 未上架嘅一批集數（短篇劇逐集上架，_mockups_/coming-soon ⑥）：摺埋一行「第 11–20 集 · 19/11（四）上架」，
 * aria-disabled（Tab / 讀屏照行到），撳落乜都唔做；右邊時鐘標記，冇播放掣
 */
const UpcomingRow = ({ item }: { item: EpisodeItem }) => (
    <button
        type="button"
        className={`${styles.row} ${styles.upcoming}`}
        aria-disabled="true"
        aria-label={item.label}
    >
        <RowDate item={item} />
        <span className={styles.body}>
            <span className={styles.status}>{item.status.text}</span>
        </span>
        <ClockIcon className={styles.play} size={CLOCK_ICON_SIZE} />
    </button>
);

/** 進度條 + 狀態字（快將下架就後面接琥珀字，LE1） */
const RowBody = ({ percent, item }: { percent: number; item: EpisodeItem }) => (
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
        <span className={`${styles.status} ${item.leaving ? styles.withLeaving : ''}`}>
            {item.status.text}
            {item.leaving && (
                <span className={styles.leaving}>
                    <Separator className={styles.leavingSeparator} />
                    <HourglassIcon size={NOTICE_ICON_SIZE} />
                    <span className={styles.leavingFull}>{item.leaving.text}</span>
                    <span className={styles.leavingTag}>{item.leaving.tag}</span>
                </span>
            )}
        </span>
    </span>
);

/** 播放掣讀屏名：日子 / 集數 + 狀態（+ 快將下架日子） */
const rowLabel = (item: EpisodeItem, date: string): string => {
    const spoken = item.status.spokenText ?? item.status.text;
    const status = item.leaving
        ? t('availability.withLeaving', { label: spoken, when: item.leaving.label })
        : spoken;
    return t(item.isPlaying ? 'episodes.pause' : 'episodes.play', { date, status });
};

export const EpisodeRow = ({
    item,
    onSelect,
}: {
    item: EpisodeItem;
    onSelect: (key: string) => void;
}) => {
    const { status, track } = item;
    if (status.kind === 'unavailable') return <UnavailableRow item={item} />;
    if (status.kind === 'upcoming') return <UpcomingRow item={item} />;
    const percent = toPercent(status.ratio);
    const date = [item.dayMonth, item.weekday, item.tag].filter(Boolean).join(' ');
    // 收藏掣唔可以放入行掣入面（掣入面唔准再有掣）：行入面留位，星疊喺個位上面（同一個 li）
    return (
        <>
            <button
                type="button"
                className={`${styles.row} ${item.current ? styles.current : ''} ${styles[status.kind] ?? ''}`}
                aria-current={item.current ? 'true' : undefined}
                aria-label={rowLabel(item, date)}
                onClick={() => onSelect(item.key)}
            >
                <RowDate item={item} />
                <RowBody percent={percent} item={item} />
                {track && <span className={styles.bookmarkSpace} aria-hidden="true" />}
                <RowIcon item={item} />
            </button>
            {track && (
                <BookmarkButton
                    track={track}
                    label={t('bookmark.toggleEpisode', { label: date })}
                    className={styles.bookmark}
                />
            )}
        </>
    );
};

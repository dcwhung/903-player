import { t } from '../../i18n/t';
import { PERCENT, toPercent } from '../../utils/ratio';
import { CheckIcon, PauseIcon, PlayIcon } from '../icons/icons';
import { Marquee } from '../Marquee/Marquee';
import styles from './EpisodeList.module.css';
import type { EpisodeItem } from './episodeListTypes';

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

export const EpisodeRow = ({
    item,
    onSelect,
}: {
    item: EpisodeItem;
    onSelect: (key: string) => void;
}) => {
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

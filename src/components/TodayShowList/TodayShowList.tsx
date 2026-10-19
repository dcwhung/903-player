import { t, type MessageKey } from '../../i18n/t';
import { Disc } from '../Disc/Disc';
import { CheckIcon, PlayIcon } from '../icons/icons';
import styles from './TodayShowList.module.css';

export type ShowStatus = 'playing' | 'watched' | 'unwatched';

export interface TodayShowItem {
    key: string;
    name: string;
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
};
const STATUS_ICON_SIZE = 12;
const PLAY_ICON_SIZE = 22;

const ShowRow = ({ item, onSelect }: { item: TodayShowItem; onSelect: (key: string) => void }) => {
    const statusText = t(STATUS_MESSAGE[item.status]);
    return (
        <button
            type="button"
            className={`${styles.item} ${item.active ? styles.active : ''}`}
            aria-current={item.active ? 'true' : undefined}
            aria-label={`${t('today.playShow', { name: item.name })}，${statusText}`}
            onClick={() => onSelect(item.key)}
        >
            <Disc size="small" />
            <span className={styles.text}>
                <span className={styles.name}>{item.name}</span>
                <span className={`${styles.status} ${styles[item.status] ?? ''}`}>
                    {item.status === 'watched' && <CheckIcon size={STATUS_ICON_SIZE} />}
                    {statusText}
                </span>
            </span>
            <PlayIcon size={PLAY_ICON_SIZE} filled={false} />
        </button>
    );
};

export const TodayShowList = ({ items, onSelect }: TodayShowListProps) => (
    <section className={styles.section} aria-labelledby="today-list-heading">
        <h2 id="today-list-heading" className={styles.heading}>
            {t('today.listTitle')}
        </h2>
        <ul className={styles.list}>
            {items.map((item) => (
                <li key={item.key}>
                    <ShowRow item={item} onSelect={onSelect} />
                </li>
            ))}
        </ul>
    </section>
);

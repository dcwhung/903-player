import { t } from '../../i18n/t';
import { EpisodeList, type EpisodeItem, type EpisodeLabels } from '../EpisodeList/EpisodeList';
import { BackIcon } from '../icons/icons';
import styles from './HomePlayerCard.module.css';

const ALL_ICON_SIZE = 14;

export interface HomeCardNext {
    items: EpisodeItem[];
    labels: EpisodeLabels;
    /** 清單標題：「下一集」（短篇）或者「昔日集數」（節目 / 每日劇） */
    title: string;
    onSelect: (key: string) => void;
    /** 「全部 ›」：入頁睇成張清單 */
    onAll: () => void;
}

/** 「下一集」/「昔日集數」：同內頁集數清單一樣嘅行，標題右邊「全部 ›」 */
export const CardNext = ({ items, labels, title, onSelect, onAll }: HomeCardNext) => (
    <div className={styles.next}>
        <EpisodeList
            items={items}
            onSelect={onSelect}
            labels={labels}
            title={title}
            aside={
                <button
                    type="button"
                    className={styles.all}
                    aria-label={t('homeCard.allLabel')}
                    onClick={onAll}
                >
                    {t('homeCard.all')}
                    <BackIcon className={styles.allIcon} size={ALL_ICON_SIZE} />
                </button>
            }
        />
    </div>
);

import { useId } from 'react';
import { t } from '../../../../i18n/t';
import type { InlineInfo } from '../../../../selectors/itemInfo';
import type { Recording } from '../../../../types/recording';
import { InfoToggle } from '../../../shared/common/ItemInfo/InfoToggle';
import { InlineItemInfo } from '../../../shared/common/ItemInfo/InlineItemInfo';
import styles from './TodayShowList.module.css';
import { ShowRow } from './TodayShowRow';
import { RowLamp } from './TodayShowRowParts';

/** connecting：揀中、播緊但未讀到時長（寫「連線中…」、冇 pill，S-730） */
export type ShowStatus = 'playing' | 'connecting' | 'watched' | 'unwatched' | 'unavailable';

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
    /** 節目資料（P9.5 #12：播放時間、主持、簡介）；冇就唔出資料區 */
    info?: InlineInfo;
}

interface TodayShowListProps {
    items: TodayShowItem[];
    onSelect: (key: string) => void;
    /** 「節目表」箭咀展開咗：每行出資料 */
    infoExpanded?: boolean;
    /** 撳箭咀；冇傳就唔出箭咀 */
    onToggleInfo?: (() => void) | undefined;
}

export const TodayShowList = ({
    items,
    onSelect,
    infoExpanded = false,
    onToggleInfo,
}: TodayShowListProps) => {
    const headingId = useId();
    const unavailable = items.filter((item) => item.status === 'unavailable').length;
    // 冇任何節目有資料就唔出箭咀（P9.5 #12）
    const canToggle = onToggleInfo !== undefined && items.some((item) => item.info);
    return (
        <section className={styles.section} aria-labelledby={headingId}>
            <div className={styles.header}>
                <span className={styles.headingGroup}>
                    <h2 id={headingId} className={styles.heading}>
                        {t('today.listTitle')}
                    </h2>
                    {canToggle && (
                        <InfoToggle
                            expanded={infoExpanded}
                            label={t('info.showInfo')}
                            onToggle={onToggleInfo}
                            className={styles.toggle}
                        />
                    )}
                </span>
                {unavailable > 0 && (
                    <span>{t('today.unavailableCount', { count: unavailable })}</span>
                )}
            </div>
            <ul className={styles.list}>
                {items.map((item) => (
                    <TodayRow
                        key={item.key}
                        item={item}
                        onSelect={onSelect}
                        expanded={canToggle && infoExpanded}
                    />
                ))}
            </ul>
        </section>
    );
};

/**
 * 每行 li：左邊條（OnAirLamp）、揀中淺底同分隔線都喺 li，展開資料（P9.5 #12）喺行掣下面，
 * 條同行一齊拉長（約八成高），碟面 / 收藏 / 播放掣留喺頂
 */
const TodayRow = ({
    item,
    onSelect,
    expanded,
}: {
    item: TodayShowItem;
    onSelect: (key: string) => void;
    expanded: boolean;
}) => (
    <li
        className={`${styles.row} ${item.active ? styles.active : ''}`}
        data-today-row=""
        data-expanded={expanded && item.info !== undefined}
    >
        <RowLamp item={item} />
        <ShowRow item={item} onSelect={onSelect} />
        {item.info && (
            <div className={styles.rowInfo}>
                <InlineItemInfo info={item.info} expanded={expanded} />
            </div>
        )}
    </li>
);

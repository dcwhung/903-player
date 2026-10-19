import { useEffect, useRef } from 'react';
import { t } from '../../i18n/t';
import { WatchedBadge } from '../WatchedBadge/WatchedBadge';
import styles from './DateSlider.module.css';

export interface DateItem {
    key: string;
    label: string;
    watched: boolean;
    selected: boolean;
}

interface DateSliderProps {
    items: DateItem[];
    onSelect: (key: string) => void;
}

/** 橫向日子列，只列有錄音嘅日子，揀中嗰日自動置中 */
export const DateSlider = ({ items, onSelect }: DateSliderProps) => {
    const selectedRef = useRef<HTMLButtonElement>(null);
    const selectedKey = items.find((item) => item.selected)?.key;

    useEffect(() => {
        selectedRef.current?.scrollIntoView?.({
            inline: 'center',
            block: 'nearest',
            behavior: 'smooth',
        });
    }, [selectedKey]);

    return (
        <section className={styles.section} aria-labelledby="date-slider-heading">
            <h2 id="date-slider-heading" className={styles.heading}>
                {t('dates.title')}
            </h2>
            <div className={styles.viewport}>
                <ul className={styles.list}>
                    {items.map((item) => (
                        <li key={item.key}>
                            <button
                                type="button"
                                ref={item.selected ? selectedRef : undefined}
                                className={`${styles.chip} ${item.selected ? styles.selected : ''}`}
                                aria-current={item.selected ? 'date' : undefined}
                                onClick={() => onSelect(item.key)}
                            >
                                {item.label}
                                {item.watched && <WatchedBadge />}
                            </button>
                        </li>
                    ))}
                </ul>
                <div className={styles.fade} aria-hidden="true" />
            </div>
        </section>
    );
};

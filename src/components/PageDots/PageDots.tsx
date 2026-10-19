import { t } from '../../i18n/t';
import styles from './PageDots.module.css';

interface PageDotsProps {
    labels: string[];
    index: number;
    onSelect: (index: number) => void;
}

/** 今日節目指示點；撳點都可以轉節目 */
export const PageDots = ({ labels, index, onSelect }: PageDotsProps) =>
    labels.length > 1 ? (
        <div
            className={styles.dots}
            role="tablist"
            aria-label={t('miniPlayer.position', { index: index + 1, total: labels.length })}
        >
            {labels.map((label, i) => (
                <button
                    key={label}
                    type="button"
                    role="tab"
                    aria-label={label}
                    aria-selected={i === index}
                    className={`${styles.dot} ${i === index ? styles.selected : ''}`}
                    onClick={() => onSelect(i)}
                />
            ))}
        </div>
    ) : null;

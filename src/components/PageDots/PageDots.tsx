import { t } from '../../i18n/t';
import styles from './PageDots.module.css';

interface PageDotsProps {
    labels: string[];
    index: number;
    onSelect: (index: number) => void;
}

/** 今日節目指示點；撳點都可以轉節目（普通掣 + aria-current，唔係 tabs pattern） */
export const PageDots = ({ labels, index, onSelect }: PageDotsProps) =>
    labels.length > 1 ? (
        <div
            className={styles.dots}
            role="group"
            aria-label={t('miniPlayer.position', { index: index + 1, total: labels.length })}
        >
            {labels.map((label, i) => (
                <button
                    key={label}
                    type="button"
                    aria-label={label}
                    aria-current={i === index ? 'true' : undefined}
                    className={`${styles.dot} ${i === index ? styles.selected : ''}`}
                    onClick={() => onSelect(i)}
                />
            ))}
        </div>
    ) : null;

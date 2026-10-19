import { t } from '../../i18n/t';
import styles from './PageDots.module.css';

interface PageDotsProps {
    /** React key（錄音 URL）；同一日可以有兩集同名節目 */
    keys: string[];
    labels: string[];
    index: number;
    onSelect: (index: number) => void;
}

/** 今日節目指示點；撳點都可以轉節目（普通掣 + aria-current，唔係 tabs pattern） */
export const PageDots = ({ keys, labels, index, onSelect }: PageDotsProps) =>
    labels.length > 1 ? (
        <div
            className={styles.dots}
            role="group"
            aria-label={t('miniPlayer.position', { index: index + 1, total: labels.length })}
        >
            {labels.map((label, i) => (
                <button
                    key={keys[i] ?? i}
                    type="button"
                    data-page-dot=""
                    aria-label={label}
                    aria-current={i === index ? 'true' : undefined}
                    className={`${styles.dot} ${i === index ? styles.selected : ''}`}
                    onClick={() => onSelect(i)}
                />
            ))}
        </div>
    ) : null;

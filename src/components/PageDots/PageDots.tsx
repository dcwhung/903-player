import type { KeyboardEvent } from 'react';
import { arrowKeyDirection, wrapIndex } from '../../hooks/swipe';
import { t } from '../../i18n/t';
import styles from './PageDots.module.css';

interface PageDotsProps {
    /** React key（錄音 URL）；同一日可以有兩集同名節目 */
    keys: string[];
    labels: string[];
    index: number;
    onSelect: (index: number) => void;
    /** 成組嘅讀屏名（第幾個，共幾個）；預設係今日節目嘅講法 */
    positionLabel?: (index: number, total: number) => string;
}

const todayPosition = (index: number, total: number) => t('miniPlayer.position', { index, total });

/**
 * 指示點（今日節目、主頁節目格分頁）；撳點都可以轉節目（普通掣 + aria-current，唔係 tabs pattern）。
 * 焦點喺點上面時左右方向鍵轉去隔籬節目（循環），同撳隔籬嗰點一樣
 */
export const PageDots = ({
    keys,
    labels,
    index,
    onSelect,
    positionLabel = todayPosition,
}: PageDotsProps) => {
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const direction = arrowKeyDirection(event.key);
        if (!direction) return;
        event.preventDefault();
        onSelect(wrapIndex(index, labels.length, direction));
    };
    return labels.length > 1 ? (
        <div
            className={styles.dots}
            role="group"
            aria-label={positionLabel(index + 1, labels.length)}
            onKeyDown={onKeyDown}
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
};

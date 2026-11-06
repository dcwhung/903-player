import { t } from '../../../../i18n/t';
import styles from './OnAirBadge.module.css';

interface OnAirBadgeProps {
    className?: string;
}

/**
 * 「播放中」紅 pill（ON AIR combo，用戶 2026-11-06 揀）：白色三條 equaliser + 「播放中」。
 * equaliser 純裝飾（aria-hidden）；行掣 aria-label 已經講一次「播放中」，
 * 掣入面嘅字唔會再讀多次。減少動態時三條靜止（CSS @media prefers-reduced-motion）
 */
export const OnAirBadge = ({ className = '' }: OnAirBadgeProps) => (
    <span className={`${styles.badge} ${className}`} data-on-air-badge="">
        <span className={styles.equaliser} aria-hidden="true">
            <span className={styles.bar} />
            <span className={styles.bar} />
            <span className={styles.bar} />
        </span>
        {t('common.status.playing')}
    </span>
);

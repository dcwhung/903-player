import { t } from '../../i18n/t';
import styles from './NewBadge.module.css';

interface NewBadgeProps {
    /** md：主頁節目格 / 劇集格；sm：短篇 chip、全集一覽表 */
    size?: 'md' | 'sm';
    /** 定位用（例如格左上角） */
    className?: string;
}

/**
 * 「新」：全 app 統一紅底白字膠囊（主頁節目格、劇集格、短篇 chip、全集一覽表）。
 * 純裝飾，讀屏由用佢嘅掣自己講（例如「…，今日有新一集」）
 */
export const NewBadge = ({ size = 'md', className = '' }: NewBadgeProps) => (
    <span className={`${styles.badge} ${styles[size]} ${className}`} aria-hidden="true">
        {t('home.newBadge')}
    </span>
);

import { t } from '../../i18n/t';
import { BackIcon } from '../icons/icons';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
    title: string;
    onBack: () => void;
    /** label：細階大楷標籤（預設）；title：節目頁用節目名做全頁標題（h1，太長就省略號） */
    variant?: 'label' | 'title';
}

export const PageHeader = ({ title, onBack, variant = 'label' }: PageHeaderProps) => (
    <header className={styles.header}>
        <button
            type="button"
            className={styles.back}
            aria-label={t('common.back')}
            onClick={onBack}
        >
            <BackIcon />
        </button>
        {/* 冇節目名（例如搵唔到節目）就唔出空嘅 h1 */}
        {variant === 'title' && title ? (
            <h1 className={styles.showTitle}>{title}</h1>
        ) : (
            <span className={styles.title}>{title}</span>
        )}
        <span aria-hidden="true" />
    </header>
);

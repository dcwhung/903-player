import { t } from '../../i18n/t';
import { BackIcon } from '../icons/icons';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
    title: string;
    onBack: () => void;
}

export const PageHeader = ({ title, onBack }: PageHeaderProps) => (
    <header className={styles.header}>
        <button
            type="button"
            className={styles.back}
            aria-label={t('common.back')}
            onClick={onBack}
        >
            <BackIcon />
        </button>
        <span className={styles.title}>{title}</span>
        <span aria-hidden="true" />
    </header>
);

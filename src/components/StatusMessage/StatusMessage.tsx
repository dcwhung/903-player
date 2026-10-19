import { t } from '../../i18n/t';
import styles from './StatusMessage.module.css';

interface StatusMessageProps {
    message: string;
    onRetry?: () => void;
}

/** 載入中 / 錯誤 / 冇資料嘅提示 */
export const StatusMessage = ({ message, onRetry }: StatusMessageProps) => (
    <div className={styles.status} role="status">
        <p>{message}</p>
        {onRetry && (
            <button type="button" className={styles.retry} onClick={onRetry}>
                {t('common.retry')}
            </button>
        )}
    </div>
);

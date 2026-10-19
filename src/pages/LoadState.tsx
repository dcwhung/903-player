import { StatusMessage } from '../components/StatusMessage/StatusMessage';
import type { LoadStatus } from '../data/recordingsContext';
import { t } from '../i18n/t';

interface LoadStateProps {
    status: LoadStatus;
    isEmpty: boolean;
    onRetry: () => void;
}

/** 載入中 / 錯誤 / 冇錄音時顯示提示；有資料就返回 null */
export const LoadState = ({ status, isEmpty, onRetry }: LoadStateProps) => {
    if (status === 'loading') {
        return <StatusMessage message={t('common.loading')} />;
    }
    if (status === 'error') {
        return <StatusMessage message={t('common.loadError')} onRetry={() => void onRetry()} />;
    }
    return isEmpty ? <StatusMessage message={t('common.noRecordings')} /> : null;
};

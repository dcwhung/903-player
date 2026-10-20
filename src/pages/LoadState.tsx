import { StatusMessage } from '../components/StatusMessage/StatusMessage';
import type { LoadStatus } from '../data/recordingsContext';
import { t } from '../i18n/t';

interface LoadStateProps {
    status: LoadStatus;
    isEmpty: boolean;
}

/** 載入中 / 冇錄音時顯示提示；有資料就返回 null */
export const LoadState = ({ status, isEmpty }: LoadStateProps) => {
    if (status === 'loading') {
        return <StatusMessage message={t('common.loading')} />;
    }
    return isEmpty ? <StatusMessage message={t('common.noRecordings')} /> : null;
};

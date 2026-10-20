import { StatusMessage } from '../components/StatusMessage/StatusMessage';
import type { LoadStatus } from '../data/recordingsContext';
import { t } from '../i18n/t';

interface LoadStateProps {
    status: LoadStatus;
    isEmpty: boolean;
    /** 第一輪 probe 仲未完：冇錄音都可能只係未搵到，唔好太早話「冇錄音」 */
    isSearching: boolean;
}

/** 載入中 / 搵緊 / 冇錄音時顯示提示；有資料就返回 null */
export const LoadState = ({ status, isEmpty, isSearching }: LoadStateProps) => {
    if (status === 'loading') {
        return <StatusMessage message={t('common.loading')} />;
    }
    if (!isEmpty) {
        return null;
    }
    return <StatusMessage message={t(isSearching ? 'common.searching' : 'common.noRecordings')} />;
};

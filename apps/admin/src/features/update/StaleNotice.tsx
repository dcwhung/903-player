/* 422 未知 selection key：待辦喺其他視窗 / 裝置變咗 → 重新載入（重讀資料 + 返更新頁重新選擇） */
import { RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminData } from '../../data/AdminData';
import { t } from '../../i18n/t';

export function StaleNotice() {
    const { refresh } = useAdminData();
    const navigate = useNavigate();
    const reload = async () => {
        await refresh();
        navigate('/');
    };
    return (
        <div className="note bad stale-note" role="alert">
            <span>{t('publish.stale')}</span>
            <button type="button" onClick={() => void reload()}>
                <RefreshCw aria-hidden="true" />
                {t('publish.reload')}
            </button>
        </div>
    );
}

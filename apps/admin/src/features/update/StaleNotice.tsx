/*
 * 確認發佈頁過時：
 * 422 未知 selection key：待辦喺其他視窗 / 裝置變咗 → 重新載入（重讀資料 + 返更新頁重新選擇）；
 * 412（ChangedNotice，AU-021）：撳發佈時內容已經同呢頁顯示嘅唔同、冇發佈 → 摘要已經重讀，睇過再撳
 */
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

export function ChangedNotice() {
    return (
        <p className="note warn" role="alert">
            {t('publish.changed')}
        </p>
    );
}

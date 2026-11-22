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

/** 412 之後重讀摘要：讀緊 / 讀到（下面係最新）/ 讀唔到（下面唔係最新，唔可以話「已更新」，S-1433） */
export type SummaryState = 'loading' | 'fresh' | 'failed';

const CHANGED_TEXT = {
    loading: 'publish.changedLoading',
    fresh: 'publish.changed',
    failed: 'publish.changedFailed',
} as const;

export function ChangedNotice({
    summary,
    onReload,
}: {
    summary: SummaryState;
    onReload: () => void;
}) {
    return (
        <div className="note warn stale-note" role="alert">
            <span>{t(CHANGED_TEXT[summary])}</span>
            {summary === 'failed' && (
                <button type="button" onClick={onReload}>
                    <RefreshCw aria-hidden="true" />
                    {t('publish.reload')}
                </button>
            )}
        </div>
    );
}

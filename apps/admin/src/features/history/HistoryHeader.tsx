/*
 * 發佈 / 部署頁頂：標題 + 「共 N 次」+ 還原失敗 / 記錄載入失敗提示（AU-025）
 * Design Origin: mockup: _mockups_/admin/index.html#s8
 */
import { RefreshCw } from 'lucide-react';
import { errorMessage } from '../../api/errorMessage';
import { t } from '../../i18n/t';

/** 記錄讀唔到（包括 session 過期）：原因 + 重試 */
function LoadError({ error, onRetry }: { error: Error; onRetry: () => void }) {
    return (
        <div className="note bad stale-note" role="alert">
            <span>{t('app.loadFailed', { error: errorMessage(error) })}</span>
            <button type="button" onClick={onRetry}>
                <RefreshCw aria-hidden="true" />
                {t('app.retry')}
            </button>
        </div>
    );
}

interface HistoryHeaderProps {
    /** 記錄數；undefined = 讀唔到又冇舊 data（唔出「共 0 次」，睇落似「讀到、零記錄」） */
    count: number | undefined;
    rollbackError: string | undefined;
    loadError: Error | undefined;
    onRetry: () => void;
}

export function HistoryHeader({ count, rollbackError, loadError, onRetry }: HistoryHeaderProps) {
    return (
        <>
            <div className="title-row">
                <h1>{t('history.title')}</h1>
                {count !== undefined && (
                    <span className="muted small">{t('history.total', { count })}</span>
                )}
            </div>
            {rollbackError && (
                <p className="note bad" role="alert">
                    {rollbackError}
                </p>
            )}
            {loadError && <LoadError error={loadError} onRetry={onRetry} />}
        </>
    );
}

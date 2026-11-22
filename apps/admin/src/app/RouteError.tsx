/*
 * Data router 嘅 errorElement（S-1434）：render 出錯時代替 React Router 預設嘅英文
 *「Unexpected Application Error!」畫面 —— 同載入失敗一樣出 .note.bad + 「重新載入」（成頁重新載入）
 */
import { RefreshCw } from 'lucide-react';
import { useRouteError } from 'react-router-dom';
import { errorMessage } from '../api/errorMessage';
import { t } from '../i18n/t';

export function RouteError() {
    const error = useRouteError();
    return (
        <div className="note bad stale-note" role="alert">
            <span>{t('app.crashed', { error: errorMessage(error) })}</span>
            <button type="button" onClick={() => window.location.reload()}>
                <RefreshCw aria-hidden="true" />
                {t('app.reload')}
            </button>
        </div>
    );
}

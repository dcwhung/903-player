/*
 * 儲存結果提示：Design Origin: mockup: _mockups_/admin/index.html#s9
 * 412 →「此劇集已在其他視窗或裝置修改…」+ 重新載入；422 → 中文說明（validationMessage，唔識就一般訊息 + 原文）；
 * warnings → 會消失嘅集數
 */
import { ExternalLink, RefreshCw } from 'lucide-react';
import { t } from '../../i18n/t';
import { clockTime } from '../../model/dates';
import type { SaveStatus } from './useEntryEditor';
import { validationMessage } from './validationMessage';

interface EditorNoticesProps {
    status: SaveStatus;
    fieldErrors: number;
    onReload: () => void;
}

/** session 過期：新分頁重新登入（呢頁未儲存嘅改動保留），返嚟再撳儲存 */
function SessionExpired() {
    return (
        <p className="note warn" role="alert">
            {t('editor.sessionExpired')}{' '}
            <a href="/auth/google/start" target="_blank" rel="noopener">
                {t('editor.relogin')}
                <ExternalLink aria-hidden="true" />
            </a>
        </p>
    );
}

/** 422：識嘅驗證錯誤講中文；唔識就一般訊息 + 可展開嘅英文原文 */
function InvalidNotice({ detail }: { detail: string }) {
    const known = validationMessage(detail);
    return (
        <div className="note bad" role="alert">
            {t('editor.invalidDetail', { detail: known ?? t('validation.general') })}
            {known === null && (
                <details className="raw-error">
                    <summary>{t('validation.original')}</summary>
                    <code>{detail}</code>
                </details>
            )}
        </div>
    );
}

export function EditorNotices({ status, fieldErrors, onReload }: EditorNoticesProps) {
    const { problem, warnings } = status;
    return (
        <>
            {fieldErrors > 0 && (
                <p className="note bad" role="alert">
                    {t('editor.invalid', { count: fieldErrors })}
                </p>
            )}
            {problem?.type === 'conflict' && (
                <div role="alert" className="conflict">
                    <p className="note warn">
                        {t('editor.conflict', { time: clockTime(problem.at) })}
                    </p>
                    <div className="actions">
                        <button type="button" className="primary" onClick={onReload}>
                            <RefreshCw aria-hidden="true" />
                            {t('editor.reload')}
                        </button>
                    </div>
                </div>
            )}
            {problem?.type === 'unauthorized' && <SessionExpired />}
            {problem?.type === 'invalid' && <InvalidNotice detail={problem.detail} />}
            {problem?.type === 'failed' && (
                <p className="note bad" role="alert">
                    {problem.message}
                </p>
            )}
            {warnings.length > 0 && (
                <p className="note warn" role="status">
                    {t('editor.warnMissing')}
                    <br />
                    {warnings.map((id, i) => (
                        <span key={id}>
                            {i > 0 && '、'}
                            <code>{id}</code>
                        </span>
                    ))}
                </p>
            )}
        </>
    );
}

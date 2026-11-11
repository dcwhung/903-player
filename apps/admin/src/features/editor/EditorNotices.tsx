/*
 * 儲存結果提示：Design Origin: mockup: _mockups_/admin/index.html#s9
 * 412 →「此劇集已在其他視窗或裝置修改…」+ 重新載入；422 → 總結；warnings → 會消失嘅集數
 */
import { t } from '../../i18n/t';
import { clockTime } from '../../model/dates';
import type { SaveStatus } from './useEntryEditor';

interface EditorNoticesProps {
    status: SaveStatus;
    fieldErrors: number;
    onReload: () => void;
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
                            {t('editor.reload')}
                        </button>
                    </div>
                </div>
            )}
            {problem?.type === 'invalid' && (
                <p className="note bad" role="alert">
                    {t('editor.invalidDetail', { detail: problem.detail })}
                </p>
            )}
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

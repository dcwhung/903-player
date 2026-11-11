/*
 * 更新內容 · 處理待辦：Design Origin: mockup: _mockups_/admin/index.html#uB
 * 必須格全部做完先可以「下一步：確認發佈 →」
 */
import { useNavigate } from 'react-router-dom';
import { useAdminData } from '../../data/AdminData';
import { t } from '../../i18n/t';
import { Stepper } from './Stepper';
import { TodoMatrix } from './TodoMatrix';
import { mustCount } from './todoModel';

export function UpdatePage() {
    const { todos, entries } = useAdminData();
    const navigate = useNavigate();
    const rows = todos.data?.rows ?? [];
    const remaining = mustCount(rows);
    return (
        <>
            <div className="title-row">
                <h1>{t('update.title')}</h1>
            </div>
            <Stepper current={2} />
            {todos.error && (
                <p className="note bad">{t('app.loadFailed', { error: todos.error.message })}</p>
            )}
            {rows.length > 0 ? (
                <TodoMatrix rows={rows} entries={entries.data ?? []} />
            ) : (
                <p className="note ok">{todos.loading ? t('app.loading') : t('update.noTodos')}</p>
            )}
            <div className="savebar">
                <span className="muted small">
                    {remaining > 0
                        ? t('update.remaining', { count: remaining })
                        : t('update.allDone')}
                </span>
                <div className="actions">
                    <button
                        type="button"
                        className="primary"
                        disabled={remaining > 0}
                        onClick={() => navigate('/publish')}
                    >
                        {t('update.next')}
                    </button>
                </div>
            </div>
        </>
    );
}

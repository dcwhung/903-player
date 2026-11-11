/*
 * 更新內容 · 處理待辦：Design Origin: mockup: _mockups_/admin/index.html#uB（結構）+
 * mockup: _mockups_/admin-style/index.html#a（漸變統計卡、按鈕 icon）。
 * 必須格全部做完先可以「下一步：確認發佈」
 */
import { AlertTriangle, Check, FileText, Inbox, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminData } from '../../data/AdminData';
import { t } from '../../i18n/t';
import { Stepper } from './Stepper';
import { TodoMatrix } from './TodoMatrix';
import { StatCards, type Stat } from '../../ui/StatCards';
import { todoStats } from './todoModel';

const statsOf = (counts: ReturnType<typeof todoStats>): Stat[] => [
    { key: 'rows', tone: 'sky', icon: Inbox, value: counts.rows, label: t('update.statRows') },
    {
        key: 'must',
        tone: 'red',
        icon: AlertTriangle,
        value: counts.must,
        label: t('update.statMust'),
    },
    {
        key: 'optional',
        tone: 'orange',
        icon: FileText,
        value: counts.optional,
        label: t('update.statOptional'),
    },
    {
        key: 'done',
        tone: 'green',
        icon: Check,
        value: counts.done,
        label: t('update.statDone'),
    },
];

export function UpdatePage() {
    const { todos, entries } = useAdminData();
    const navigate = useNavigate();
    const rows = todos.data?.rows ?? [];
    const counts = todoStats(rows);
    const remaining = counts.must;
    const stats = statsOf(counts);
    return (
        <>
            <div className="title-row">
                <h1>{t('update.title')}</h1>
            </div>
            <Stepper current={2} />
            {rows.length > 0 && <StatCards stats={stats} label={t('update.statsLabel')} />}
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
                        className="primary big"
                        disabled={remaining > 0}
                        onClick={() => navigate('/publish')}
                    >
                        <Send aria-hidden="true" />
                        {t('update.next')}
                    </button>
                </div>
            </div>
        </>
    );
}

/*
 * 更新 · 處理待辦：Design Origin: mockup: _mockups_/admin/index.html#uB（結構）+
 * mockup: _mockups_/admin-style/index.html#a（漸變統計卡、按鈕 icon）+
 * mockup: _mockups_/admin-selective-publish/index.html#a（App 外觀 section、「發佈」勾選、選擇發佈）。
 * 有「必須處理」都可以「下一步」：未完成嘅行今次唔發佈
 */
import { AlertTriangle, Check, FileText, Inbox } from 'lucide-react';
import { useEffect } from 'react';
import { useAdminData } from '../../data/AdminData';
import { t } from '../../i18n/t';
import { AppearanceSection } from './AppearanceSection';
import { usePublishSelection } from './PublishSelection';
import { SelectionFooter } from './SelectionFooter';
import { Stepper } from './Stepper';
import { TodoMatrix } from './TodoMatrix';
import { StatCards, type Stat } from '../../ui/StatCards';
import { incompleteRows, selectionOf } from './selectionModel';
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
    const { todos, entries, changes } = useAdminData();
    const { unpicked, toggleContent, toggleAppearance } = usePublishSelection();
    const { reload } = changes;
    // App 外觀 / 其他改動可能喺其他頁改咗：入嚟就重讀
    useEffect(() => void reload(), [reload]);
    const rows = todos.data?.rows ?? [];
    const appearance = changes.data?.appearance;
    const selection = selectionOf(rows, appearance, unpicked);
    return (
        <>
            <div className="title-row">
                <h1>{t('update.title')}</h1>
            </div>
            <Stepper current={2} />
            {rows.length > 0 && (
                <StatCards stats={statsOf(todoStats(rows))} label={t('update.statsLabel')} />
            )}
            {todos.error && (
                <p className="note bad">{t('app.loadFailed', { error: todos.error.message })}</p>
            )}
            <AppearanceSection
                appearance={appearance}
                unpicked={unpicked.appearance}
                onToggle={toggleAppearance}
            />
            {rows.length > 0 ? (
                <TodoMatrix
                    rows={rows}
                    entries={entries.data ?? []}
                    unpicked={unpicked.content}
                    onToggle={toggleContent}
                />
            ) : (
                <p className="note ok">{todos.loading ? t('app.loading') : t('update.noTodos')}</p>
            )}
            <SelectionFooter
                selection={selection}
                incomplete={incompleteRows(rows).length}
                others={changes.data?.others?.items ?? []}
                loading={changes.data === undefined}
            />
        </>
    );
}

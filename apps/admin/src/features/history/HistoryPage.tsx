/*
 * 上下架記錄：Design Origin: mockup: _mockups_/admin/index.html#s8
 * 還原：撳「還原」→ 確認（3 步）→ POST /api/publishes/:id/rollback
 * 還原 / 重新部署進行中：全部動作掣停用（AU-025）；記錄載入失敗顯示原因 + 重試，唔當係「未有記錄」
 */
import { useState } from 'react';
import { RefreshCw, Undo2 } from 'lucide-react';
import { listPublishes } from '../../api/endpoints';
import { errorMessage } from '../../api/errorMessage';
import type { LoadedEntry, PublishSummary } from '../../api/types';
import { useAdminData } from '../../data/AdminData';
import { useResource } from '../../data/useResource';
import { t } from '../../i18n/t';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { HistoryRow } from './HistoryRow';
import { useHistoryActions } from './useHistoryActions';

/** 每行失敗時播放器仍用緊嘅版本 = 佢之前最近一次 ok */
const servingBefore = (rows: readonly PublishSummary[], index: number) =>
    rows.slice(index + 1).find((row) => row.status === 'ok')?.id;

function HistoryTable({
    rows,
    entries,
    busy,
    onRollback,
    onRedeploy,
}: {
    rows: readonly PublishSummary[];
    entries: readonly LoadedEntry[];
    busy: boolean;
    onRollback: (id: number) => void;
    onRedeploy: (id: number) => void;
}) {
    return (
        <div className="card flush" role="table" aria-label={t('history.title')} aria-busy={busy}>
            <div className="hist-head" role="row">
                <span role="columnheader">{t('history.colVersion')}</span>
                <span role="columnheader">{t('history.colChanges')}</span>
            </div>
            {rows.map((row, i) => (
                <HistoryRow
                    key={row.id}
                    row={row}
                    servingId={servingBefore(rows, i)}
                    entries={entries}
                    busy={busy}
                    onRollback={onRollback}
                    onRedeploy={onRedeploy}
                />
            ))}
        </div>
    );
}

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

export function HistoryPage() {
    const publishes = useResource(listPublishes);
    const { entries, refresh } = useAdminData();
    const [confirming, setConfirming] = useState<number | null>(null);
    const { busy, rollbackError, rollbackTo, redeployTo } = useHistoryActions({
        reloadPublishes: publishes.reload,
        refresh,
    });
    const rows = publishes.data ?? [];
    const onConfirm = (id: number) => {
        setConfirming(null);
        void rollbackTo(id);
    };
    return (
        <>
            <div className="title-row">
                <h1>{t('history.title')}</h1>
                <span className="muted small">{t('history.total', { count: rows.length })}</span>
            </div>
            {rollbackError && (
                <p className="note bad" role="alert">
                    {rollbackError}
                </p>
            )}
            {publishes.error && (
                <LoadError error={publishes.error} onRetry={() => void publishes.reload()} />
            )}
            <HistoryTable
                rows={rows}
                entries={entries.data ?? []}
                busy={busy}
                onRollback={setConfirming}
                onRedeploy={(id) => void redeployTo(id)}
            />
            {!publishes.loading && !publishes.error && rows.length === 0 && (
                <p className="muted">{t('history.empty')}</p>
            )}
            {confirming !== null && (
                <RollbackConfirm
                    id={confirming}
                    onConfirm={() => onConfirm(confirming)}
                    onCancel={() => setConfirming(null)}
                />
            )}
        </>
    );
}

function RollbackConfirm({
    id,
    onConfirm,
    onCancel,
}: {
    id: number;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <ConfirmDialog
            title={t('history.confirmTitle', { id })}
            body={t('history.confirmBody', { id })}
            note={t('history.confirmNote')}
            confirmLabel={t('history.rollback')}
            confirmIcon={<Undo2 aria-hidden="true" />}
            confirmClassName="revert-btn dialog-revert"
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    );
}

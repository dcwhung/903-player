/*
 * 上下架記錄：Design Origin: mockup: _mockups_/admin/index.html#s8
 * 還原：撳「還原」→ 確認（3 步）→ POST /api/publishes/:id/rollback
 */
import { useState } from 'react';
import { listPublishes, rollback } from '../../api/endpoints';
import type { LoadedEntry, PublishSummary } from '../../api/types';
import { useAdminData } from '../../data/AdminData';
import { useResource } from '../../data/useResource';
import { t } from '../../i18n/t';
import { useToast } from '../../ui/Toast';
import { Undo2 } from 'lucide-react';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { HistoryRow } from './HistoryRow';
import { errorMessage } from '../../api/errorMessage';

/** 每行失敗時播放器仍用緊嘅版本 = 佢之前最近一次 ok */
const servingBefore = (rows: readonly PublishSummary[], index: number) =>
    rows.slice(index + 1).find((row) => row.status === 'ok')?.id;

function HistoryTable({
    rows,
    entries,
    onRollback,
}: {
    rows: readonly PublishSummary[];
    entries: readonly LoadedEntry[];
    onRollback: (id: number) => void;
}) {
    return (
        <div className="card flush" role="table" aria-label={t('history.title')}>
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
                    onRollback={onRollback}
                />
            ))}
        </div>
    );
}

export function HistoryPage() {
    const publishes = useResource(listPublishes);
    const { entries, refresh } = useAdminData();
    const [confirming, setConfirming] = useState<number | null>(null);
    const toast = useToast();
    const [error, setError] = useState<string>();
    const rows = publishes.data ?? [];
    const onConfirm = async (id: number) => {
        setConfirming(null);
        try {
            if ((await rollback(id)).unchanged) toast(t('publish.unchanged'));
        } catch (rollbackError) {
            setError(errorMessage(rollbackError));
        }
        await Promise.all([publishes.reload(), refresh()]);
    };
    return (
        <>
            <div className="title-row">
                <h1>{t('history.title')}</h1>
                <span className="muted small">{t('history.total', { count: rows.length })}</span>
            </div>
            {error && (
                <p className="note bad" role="alert">
                    {error}
                </p>
            )}
            <HistoryTable rows={rows} entries={entries.data ?? []} onRollback={setConfirming} />
            {!publishes.loading && rows.length === 0 && (
                <p className="muted">{t('history.empty')}</p>
            )}
            {confirming !== null && (
                <ConfirmDialog
                    title={t('history.confirmTitle', { id: confirming })}
                    body={t('history.confirmBody', { id: confirming })}
                    note={t('history.confirmNote')}
                    confirmLabel={t('history.rollback')}
                    confirmIcon={<Undo2 aria-hidden="true" />}
                    onConfirm={() => void onConfirm(confirming)}
                    onCancel={() => setConfirming(null)}
                />
            )}
        </>
    );
}

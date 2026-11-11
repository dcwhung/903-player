/*
 * 自動掃描 bar（頂部細 bar）：掃描中 / 發現 N 項 / 沒有新內容 + 重新掃描。
 * Design Origin: mockup: _mockups_/admin/index.html#u0（.scan-bar）
 */
import { RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TodoRow } from '../../api/types';
import type { ScanState } from '../../data/useScan';
import { t } from '../../i18n/t';
import { clockTime } from '../../model/dates';

interface ScanBarProps {
    scan: ScanState;
    rows: readonly TodoRow[] | undefined;
    onRescan: () => void;
    /** 已經喺待辦頁：唔使「處理待辦 →」 */
    onTodosPage: boolean;
}

export const scanCounts = (rows: readonly TodoRow[]) => ({
    found: rows.filter((row) => row.kind !== 'missingFolder').length,
    attention: rows.filter((row) => row.kind === 'missingFolder').length,
});

const foundText = ({ found, attention }: ReturnType<typeof scanCounts>) =>
    [
        found > 0 ? t('scan.found', { count: found }) : '',
        attention > 0 ? t('scan.attention', { count: attention }) : '',
    ]
        .filter(Boolean)
        .join('、');

const RescanButton = ({ onRescan }: { onRescan: () => void }) => (
    <button type="button" onClick={onRescan}>
        <RefreshCw aria-hidden="true" />
        {t('scan.rescan')}
    </button>
);

export function ScanBar({ scan, rows, onRescan, onTodosPage }: ScanBarProps) {
    if (scan.status === 'scanning')
        return (
            <div className="scan-bar" role="status">
                <span className="spinner" aria-hidden="true" />
                {t('scan.running')}
            </div>
        );
    if (scan.status === 'error')
        return (
            <div className="scan-bar failed" role="alert">
                <span>{t('scan.failed', { error: scan.error })}</span>
                <RescanButton onRescan={onRescan} />
            </div>
        );
    const done = t('scan.done', { time: clockTime(scan.scannedAt) });
    const counts = scanCounts(rows ?? []);
    if (counts.found + counts.attention === 0)
        return (
            <div className="scan-bar none" role="status">
                <span>{`${done}· ${t('scan.none')}`}</span>
                <RescanButton onRescan={onRescan} />
            </div>
        );
    return (
        <div className="scan-bar found" role="status">
            <span>{`${done}· ${foundText(counts)}`}</span>
            {onTodosPage ? (
                <RescanButton onRescan={onRescan} />
            ) : (
                <Link to="/">{t('scan.goTodos')}</Link>
            )}
        </div>
    );
}

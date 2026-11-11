/*
 * 虛線框「由 R2 掃描」：資料夾、檔名模板（唯讀）+ 框線右邊 ⟳ 重新掃描
 * Design Origin: mockup: _mockups_/admin/index.html#s4（fieldset.scan-box）
 */
import { RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { t } from '../../i18n/t';

interface ScanBoxProps {
    busy: boolean;
    message?: string | undefined;
    onRescan: () => void;
    children: ReactNode;
    id?: string;
}

export function ScanBox({ busy, message, onRescan, children, id }: ScanBoxProps) {
    return (
        <fieldset className="field wide scan-box" id={id}>
            <legend>{t('drama.scanBox')}</legend>
            <button
                type="button"
                className="rescan"
                onClick={onRescan}
                disabled={busy}
                aria-busy={busy}
            >
                <RefreshCw aria-hidden="true" />
                {busy ? t('drama.rescanning') : t('drama.rescan')}
            </button>
            {children}
            {message && (
                <span className="small muted" role="status">
                    {message}
                </span>
            )}
        </fieldset>
    );
}

export function ReadonlyValue({
    label,
    value,
    code = false,
    hint,
}: {
    label: string;
    value: string;
    code?: boolean;
    /** 欄下面一行 muted 細字（例如檔名例子） */
    hint?: string | undefined;
}) {
    return (
        <div className="field">
            <span>{label}</span>
            <div className="readonly-box">
                {code ? <code>{value}</code> : <span className="val">{value}</span>}
            </div>
            {hint && <span className="muted small field-hint">{hint}</span>}
        </div>
    );
}

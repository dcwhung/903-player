/*
 * 發佈前配色警告（唔阻發佈）：Design Origin: mockup: _mockups_/admin-phase4/index.html#f
 * 淨係警告 → 一行摘要「N 項配色對比度警告（不影響發佈）」+「展開」；有驗證錯誤 → 全部展開（Q12）。
 * 每行有「前往修改 / 前往選擇」去對應配色
 */
import { TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { LoadedEntry, PublishWarning } from '../../api/types';
import { t } from '../../i18n/t';
import { warningRows } from './warningModel';

interface PublishWarningsProps {
    warnings: readonly PublishWarning[];
    entries: readonly LoadedEntry[];
    /** 有驗證錯誤：一開就全部展開、唔使收埋 */
    forceOpen: boolean;
}

export function PublishWarnings({ warnings, entries, forceOpen }: PublishWarningsProps) {
    const [open, setOpen] = useState(false);
    const rows = warningRows(warnings, entries);
    if (rows.length === 0) return null;
    const expanded = forceOpen || open;
    return (
        <div className="pub-warnings">
            <p className="note warn">
                <TriangleAlert aria-hidden="true" />
                <span>
                    {t('publish.warnSummary', { count: rows.length })}
                    {!forceOpen && (
                        <button
                            type="button"
                            className="link-btn"
                            aria-expanded={open}
                            onClick={() => setOpen(!open)}
                        >
                            {t(open ? 'publish.collapse' : 'publish.expand')}
                        </button>
                    )}
                </span>
            </p>
            {expanded && (
                <ul className="issues warn" aria-label={t('publish.warnLabel')}>
                    {rows.map((row) => (
                        <li key={row.key}>
                            <TriangleAlert aria-hidden="true" />
                            <span>
                                {row.text}
                                <small>{row.scope}</small>
                            </span>
                            <Link to={row.href}>{row.action}</Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

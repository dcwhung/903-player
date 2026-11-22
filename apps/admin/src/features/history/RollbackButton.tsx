/*
 * 版本欄最底嘅「還原」掣（使用中 / 失敗嘅版本冇）；有還原 / 重新部署進行中就停用（AU-025）
 * Design Origin: mockup: _mockups_/admin/index.html#s8（.hist-row）
 */
import { Undo2 } from 'lucide-react';
import type { PublishSummary } from '../../api/types';
import { t } from '../../i18n/t';

interface RollbackButtonProps {
    row: PublishSummary;
    busy: boolean;
    onRollback: (id: number) => void;
}

export function RollbackButton({ row, busy, onRollback }: RollbackButtonProps) {
    if (row.current || row.status !== 'ok') return null;
    return (
        <button
            type="button"
            className="revert-btn"
            disabled={busy}
            onClick={() => onRollback(row.id)}
            aria-label={t('history.rollbackTo', { id: row.id })}
        >
            <Undo2 aria-hidden="true" />
            {t('history.rollback')}
        </button>
    );
}

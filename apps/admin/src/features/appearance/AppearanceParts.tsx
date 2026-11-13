/*
 * App 外觀三張卡共用：狀態 pill（內建預設 / 自訂，· 未發佈 / · 未儲存）、卡頭（標題 + pill + 還原 + 主要掣）、
 * 還原確認 dialog。掣字短（還原 / 更換 / 儲存），aria-label 寫明對象
 * Design Origin: mockup: _mockups_/admin-appearance/index.html#a（.card-head）
 */
import { Undo2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { t } from '../../i18n/t';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Pill } from '../../ui/Pill';

interface StatusPillProps {
    custom: boolean;
    /** 草稿同最新發佈唔同 */
    pending: boolean;
    /** 表格有改但未儲存（名稱與簡介） */
    unsaved?: boolean;
}

export function StatusPill({ custom, pending, unsaved = false }: StatusPillProps) {
    if (unsaved) return <Pill tone="warn">{t('appearance.statusUnsaved')}</Pill>;
    if (!custom)
        return (
            <Pill>
                {t(pending ? 'appearance.statusDefaultPending' : 'appearance.statusDefault')}
            </Pill>
        );
    return (
        <Pill tone="ok">
            {t(pending ? 'appearance.statusCustomPending' : 'appearance.statusCustom')}
        </Pill>
    );
}

interface CardHeadProps {
    title: string;
    status: ReactNode;
    restoreLabel: string;
    canRestore: boolean;
    onRestore: () => void;
    /** 主要掣（更換 / 儲存） */
    children: ReactNode;
}

export const CardHead = ({ title, status, restoreLabel, canRestore, ...rest }: CardHeadProps) => (
    <div className="card-head">
        <h2>{title}</h2>
        {status}
        <button
            type="button"
            className="ghost-danger"
            aria-label={restoreLabel}
            disabled={!canRestore}
            onClick={rest.onRestore}
        >
            <Undo2 aria-hidden="true" />
            {t('appearance.restore')}
        </button>
        {rest.children}
    </div>
);

interface RestoreDialogProps {
    title: string;
    body: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const RestoreDialog = ({ title, body, onConfirm, onCancel }: RestoreDialogProps) => (
    <ConfirmDialog
        title={title}
        body={body}
        confirmLabel={t('appearance.restore')}
        confirmIcon={<Undo2 aria-hidden="true" />}
        danger
        onConfirm={onConfirm}
        onCancel={onCancel}
    />
);

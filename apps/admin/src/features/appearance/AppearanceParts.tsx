/*
 * App 外觀三張卡共用：狀態 pill（內建預設 / 自訂，· 未發佈 / · 未儲存）、卡頭（標題 + pill + 還原 + 主要掣）、
 * 還原確認 dialog。掣字短（還原 / 更換 / 儲存），aria-label 寫明對象
 * Design Origin: mockup: _mockups_/admin-appearance/index.html#a（.card-head）
 */
import { Undo2 } from 'lucide-react';
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { t } from '../../i18n/t';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Pill } from '../../ui/Pill';
import { restoreLostFocus } from '../revert/revertFocus';

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

/**
 * S-1013：還原成功、重讀之後冇得再還原 → 還原掣 unmount，focus 會跌落 body。
 * 掣由有變冇嗰下（只有還原會咁）focus 跌咗就搬去同一張卡嘅主要掣（更換 / 儲存）；
 * 主要掣 disabled（儲存冇改動）就去卡標題（restoreLostFocus 補 tabIndex -1）
 */
const useRefocusWhenRestoreHides = (
    canRestore: boolean,
    head: RefObject<HTMLDivElement | null>,
) => {
    const could = useRef(canRestore);
    useEffect(() => {
        const hidden = could.current && !canRestore;
        could.current = canRestore;
        if (!hidden) return;
        restoreLostFocus(
            () =>
                head.current?.querySelector<HTMLElement>('button:not(:disabled)') ??
                head.current?.querySelector<HTMLElement>('h2') ??
                null,
        );
    }, [canRestore, head]);
};

export function CardHead({ title, status, restoreLabel, canRestore, ...rest }: CardHeadProps) {
    const head = useRef<HTMLDivElement>(null);
    useRefocusWhenRestoreHides(canRestore, head);
    return (
        <div className="card-head" ref={head}>
            <h2>{title}</h2>
            {status}
            {/* 冇得還原（內建預設）就唔顯示（C-023，用戶 2026-11-15：disabled 嘅還原掣隱藏） */}
            {canRestore && (
                <button
                    type="button"
                    className="ghost-danger"
                    aria-label={restoreLabel}
                    onClick={rest.onRestore}
                >
                    <Undo2 aria-hidden="true" />
                    {t('appearance.restore')}
                </button>
            )}
            {rest.children}
        </div>
    );
}

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

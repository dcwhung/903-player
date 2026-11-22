/*
 * 編輯頁「未儲存就離開」守衛（AU-023，用戶決定：確認框 + beforeunload）：
 * app 內跳轉（側欄、麵包屑、上一頁）→ react-router blocker + ConfirmDialog（留下 / 離開）；
 * 重新整理 / 關分頁 → beforeunload（瀏覽器原生提示，文字由瀏覽器決定）。
 * 邊啲跳轉唔問見 leaveRules.ts
 */
import { LogOut } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { useBlocker, type BlockerFunction } from 'react-router-dom';
import { t } from '../../i18n/t';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { blocksLeave } from './leaveRules';

/** 有未儲存改動期間先掛 handler（掛住會令瀏覽器停用 back/forward cache） */
const useUnloadPrompt = (dirty: boolean) => {
    useEffect(() => {
        if (!dirty) return undefined;
        const ask = (event: BeforeUnloadEvent) => event.preventDefault();
        window.addEventListener('beforeunload', ask);
        return () => window.removeEventListener('beforeunload', ask);
    }, [dirty]);
};

export function LeaveGuard({ dirty }: { dirty: boolean }) {
    const shouldBlock = useCallback<BlockerFunction>((args) => dirty && blocksLeave(args), [dirty]);
    const blocker = useBlocker(shouldBlock);
    useUnloadPrompt(dirty);
    if (blocker.state !== 'blocked') return null;
    return (
        <ConfirmDialog
            title={t('editor.leaveTitle')}
            body={t('editor.leaveBody')}
            cancelLabel={t('editor.stay')}
            confirmLabel={t('editor.leave')}
            confirmIcon={<LogOut aria-hidden="true" />}
            danger
            onConfirm={() => blocker.proceed()}
            onCancel={() => blocker.reset()}
        />
    );
}

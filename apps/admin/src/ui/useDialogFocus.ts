/*
 * 兩粒掣嘅對話框（取消 / 確認）：開啟時 focus 入「取消」、Tab 喺兩粒掣之間循環、Esc 取消；
 * 關閉後 focus 返去原本個掣（ConfirmDialog、ImagePreviewDialog 共用）
 */
import { useEffect, useRef, type KeyboardEvent } from 'react';

export const useDialogFocus = (onCancel: () => void) => {
    const cancelRef = useRef<HTMLButtonElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        const opener = document.activeElement as HTMLElement | null;
        cancelRef.current?.focus();
        return () => opener?.focus();
    }, []);
    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') onCancel();
        if (event.key !== 'Tab') return;
        event.preventDefault();
        const next = document.activeElement === cancelRef.current ? confirmRef : cancelRef;
        next.current?.focus();
    };
    return { cancelRef, confirmRef, onKeyDown };
};

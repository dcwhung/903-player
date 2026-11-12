/*
 * 多粒掣嘅 modal（裁切 dialog）：開啟時 focus 入「取消」、Tab / Shift+Tab 喺 dialog 入面循環、Esc 取消、
 * 撳 dialog 外面（scrim）取消；locked（載入中 / 上載中，S-817）時 Esc 同撳外面都唔收。關閉後 focus 返去原本個掣
 */
import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';

const FOCUSABLE =
    'button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Tab 喺最後一個（Shift+Tab 喺第一個）就兜返轉頭；focus 走咗出 dialog 都拉返入嚟 */
const trapTab = (event: KeyboardEvent, dialog: HTMLElement | null) => {
    const items = [...(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    const first = items[0];
    const last = items.at(-1);
    if (!first || !last) return;
    const active = document.activeElement as HTMLElement;
    const edge = event.shiftKey ? first : last;
    if (active !== edge && items.includes(active)) return;
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
};

export const useModalKeys = (onCancel: () => void, locked: boolean) => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);
    const downOnScrim = useRef(false);
    useEffect(() => {
        const opener = document.activeElement as HTMLElement | null;
        cancelRef.current?.focus();
        // 載入中「取消」disabled focus 唔到：focus dialog 本身（tabIndex -1），Tab 照樣喺入面行
        if (document.activeElement !== cancelRef.current) dialogRef.current?.focus();
        return () => opener?.focus();
    }, []);
    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && !locked) onCancel();
        if (event.key === 'Tab') trapTab(event, dialogRef.current);
    };
    // 要 pointerdown 同 click 都喺 scrim 先算「撳外面」（喺 dialog 入面拖出去放手唔算）
    const onPointerDown = (event: PointerEvent) => {
        downOnScrim.current = event.target === event.currentTarget;
    };
    const onClick = (event: { target: EventTarget; currentTarget: EventTarget }) => {
        const outside = downOnScrim.current && event.target === event.currentTarget;
        downOnScrim.current = false;
        if (outside && !locked) onCancel();
    };
    return { dialogRef, cancelRef, scrimProps: { onKeyDown, onPointerDown, onClick } };
};

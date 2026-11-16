/*
 * 多粒掣嘅 modal（裁切 dialog）：開啟時 focus 入「取消」、Tab / Shift+Tab 喺 dialog 入面循環、Esc 取消、
 * 撳 dialog 外面（scrim）取消；locked（載入中 / 上載中，S-817）時 Esc 同撳外面都唔收，focus 移去 dialog 本身。
 * 關閉後 focus 返去 returnFocus（冇就原本個掣）
 */
import { useEffect, useRef, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';

const FOCUSABLE =
    'button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Tab 喺最後一個（Shift+Tab 喺第一個）就兜返轉頭；focus 走咗出 dialog 都拉返入嚟 */
const trapTab = (event: KeyboardEvent, dialog: HTMLElement | null) => {
    const items = [...(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    const first = items[0];
    const last = items.at(-1);
    // 全部掣都 disabled（上載中）：Tab 唔准走出 dialog
    if (!first || !last) {
        event.preventDefault();
        dialog?.focus();
        return;
    }
    const active = document.activeElement as HTMLElement;
    const edge = event.shiftKey ? first : last;
    if (active !== edge && items.includes(active)) return;
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
};

/**
 * locked 一變就執返 focus：鎖住而 focus 喺 disabled 掣（user-event / browser 都唔會向佢派 keydown，Esc 收唔到）
 * 或者 dialog 外面 → dialog 本身；解鎖而 focus 喺 dialog 本身 / 外面 →「取消」
 */
const keepFocusInside = (
    dialog: HTMLElement | null,
    cancel: HTMLElement | null,
    locked: boolean,
) => {
    if (!dialog) return;
    const active = document.activeElement;
    const inside = active instanceof HTMLElement && dialog.contains(active);
    if (locked && (!inside || active.matches(':disabled'))) dialog.focus();
    if (!locked && (!inside || active === dialog)) cancel?.focus();
};

/** 開啟 / locked 變化 / 關閉時嘅 focus；returnFocus：開 dialog 嗰陣原本個掣可能已經 disabled（browser 會將 focus 移去 body） */
const useModalFocus = (locked: boolean, returnFocus?: RefObject<HTMLElement | null>) => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        const back = returnFocus?.current ?? (document.activeElement as HTMLElement | null);
        cancelRef.current?.focus();
        // 載入中「取消」disabled focus 唔到：focus dialog 本身（tabIndex -1），Tab 照樣喺入面行
        if (document.activeElement !== cancelRef.current) dialogRef.current?.focus();
        return () => back?.focus();
    }, [returnFocus]);
    useEffect(() => keepFocusInside(dialogRef.current, cancelRef.current, locked), [locked]);
    return { dialogRef, cancelRef };
};

export const useModalKeys = (
    onCancel: () => void,
    locked: boolean,
    returnFocus?: RefObject<HTMLElement | null>,
) => {
    const { dialogRef, cancelRef } = useModalFocus(locked, returnFocus);
    const downOnScrim = useRef(false);
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

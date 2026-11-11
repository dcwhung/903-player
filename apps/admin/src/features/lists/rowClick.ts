/*
 * 列表成行撳入編輯頁（3c）：撳行入面嘅掣 / 連結 / 輸入框（⠿ 拖曳、展開、名連結）照做佢哋自己嘅嘢；
 * 揀緊字唔跳頁。鍵盤用名稱連結（Tab 到名 + Enter），所以成行唔使再做 focus 位
 */
import type { MouseEvent } from 'react';

const INTERACTIVE = 'a, button, input, textarea, select, label, [role="button"], [role="switch"]';

export const isRowBackgroundClick = (event: MouseEvent<HTMLElement>): boolean => {
    const target = event.target instanceof Element ? event.target : null;
    const control = target?.closest(INTERACTIVE);
    if (control && event.currentTarget.contains(control)) return false;
    return (window.getSelection?.()?.toString() ?? '') === '';
};

export const rowClickTo =
    (open: () => void) =>
    (event: MouseEvent<HTMLElement>): void => {
        if (isRowBackgroundClick(event)) open();
    };

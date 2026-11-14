/*
 * S-1007：還原成功、重讀之後觸發掣多數會 unmount（冇改動就唔出），focus 會跌落 body。
 * 揀仍然喺頁面嘅目標（按次序）：
 * 1. 編輯頁：同一個欄位（.field）/ 圖位（.slot）入面嘅輸入框，冇就第一個可 focus 嘅控制
 * 2. 確認發佈時間線：同一張卡（data-revert-anchor，重讀後按 key 搵返，唔靠舊 DOM）
 * 3. 頁面標題（h1；本身唔 focus 得就加 tabIndex -1）
 * 用戶已經自己 focus 咗第二度就唔郁
 */
const CONTAINER = '.field, .slot';
const INPUT = 'input:not(:disabled), textarea:not(:disabled), select:not(:disabled)';
const FOCUSABLE = `${INPUT}, button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])`;
export const REVERT_ANCHOR = 'data-revert-anchor';

const controlIn = (container: Element | null): HTMLElement | null =>
    container?.isConnected
        ? (container.querySelector<HTMLElement>(INPUT) ??
          container.querySelector<HTMLElement>(FOCUSABLE))
        : null;

const anchorOf = (key: string | null): HTMLElement | null =>
    key === null
        ? null
        : ([...document.querySelectorAll<HTMLElement>(`[${REVERT_ANCHOR}]`)].find(
              (element) => element.getAttribute(REVERT_ANCHOR) === key,
          ) ?? null);

/** 開框嗰陣（觸發掣仲喺度）記低搵目標嘅方法；重讀之後先叫 */
export const revertFocusTarget = (trigger: Element | null): (() => HTMLElement | null) => {
    const container = trigger?.closest(CONTAINER) ?? null;
    const anchor = trigger?.closest(`[${REVERT_ANCHOR}]`)?.getAttribute(REVERT_ANCHOR) ?? null;
    return () =>
        controlIn(container) ?? anchorOf(anchor) ?? document.querySelector<HTMLElement>('h1');
};

/** focus 跌咗（body / 已移除嘅元素）先搬去目標 */
export const restoreLostFocus = (target: () => HTMLElement | null) => {
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) return;
    const element = target();
    if (!element) return;
    if (!element.matches(FOCUSABLE) && !element.hasAttribute('tabindex')) element.tabIndex = -1;
    element.focus();
};

/** 遮住成頁嘅表 / 選單（休眠選單、清單 sheet 等）；橫版 docked 嘅 aria-modal="false" 唔計 */
const MODAL_DIALOG_SELECTOR = '[role="dialog"][aria-modal="true"]';

/**
 * 而家有冇 modal dialog 開緊（閒置畫面 9b：有就唔轉）。
 * ignore = 唔計嘅元素：閒置畫面自己都係 modal dialog
 */
export const hasOpenModalDialog = (ignore: Element | null = null): boolean =>
    Array.from(document.querySelectorAll(MODAL_DIALOG_SELECTOR)).some((el) => el !== ignore);

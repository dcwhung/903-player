/** Tab 會停嘅元素（再由 isTabbable 篩走 disabled / tabindex="-1" / 收埋咗嘅） */
const TABBABLE_SELECTOR = [
    'a[href]',
    'area[href]',
    'button',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    'iframe',
    'summary',
    '[contenteditable]:not([contenteditable="false"])',
    '[tabindex]',
].join(',');

/** checkVisibility 唔支援（舊瀏覽器 / jsdom）就當見到：寧願多計一粒，唔好成張表冇嘢 focus */
const isVisible = (el: HTMLElement): boolean =>
    typeof el.checkVisibility === 'function' ? el.checkVisibility() : true;

const isTabbable = (el: HTMLElement): boolean =>
    el.tabIndex >= 0 &&
    !el.matches(':disabled') &&
    el.closest('[inert], [hidden]') === null &&
    isVisible(el);

/** 撳 Tab 嗰刻先搵（清單 lazy render、展開資料都會加減掣），唔 cache */
const tabbablesIn = (sheet: HTMLElement): HTMLElement[] =>
    [...sheet.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)].filter(isTabbable);

/** 焦點喺另一張開住嘅 modal 入面（兩張表同時開）：交畀嗰張自己處理，唔好兩張搶 */
const isInOtherModal = (active: Element | null, sheet: HTMLElement): boolean => {
    const modal = active?.closest('[aria-modal="true"]');
    return modal !== null && modal !== undefined && modal !== sheet;
};

/**
 * aria-modal 嘅表開住：Tab / Shift+Tab 唔准行出表外（WCAG 2.4.3 / APG dialog）。
 * 最尾 Tab → 最頭、最頭（或者表本身）Shift+Tab → 最尾；焦點已經走咗出去（例如撳過 <body>）就拉返入嚟。
 * 表入面兩粒掣之間照交畀瀏覽器行。橫版 docked（aria-modal="false"）冇遮罩，唔困
 */
export const trapTab = (event: KeyboardEvent, sheet: HTMLElement | null) => {
    if (event.key !== 'Tab' || sheet?.getAttribute('aria-modal') !== 'true') return;
    const active = document.activeElement;
    if (isInOtherModal(active, sheet)) return;
    const tabbables = tabbablesIn(sheet);
    const first = tabbables[0];
    const last = tabbables.at(-1);
    const escaped = active === null || !sheet.contains(active);
    let target: HTMLElement | undefined;
    if (event.shiftKey) {
        if (escaped || active === sheet || active === first) target = last ?? sheet;
    } else if (escaped || active === last) {
        target = first ?? sheet;
    }
    if (!target) return;
    event.preventDefault();
    // 同打開時一樣唔准捲（表仲滑緊上嚟時 focus 會捲祖先）
    target.focus({ preventScroll: true });
};

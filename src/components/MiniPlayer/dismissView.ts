import type { CSSProperties } from 'react';
import type { DismissView } from './useDismissGesture';

/** 浮起 / 拉緊 / 露出關閉掣：CSS 用 data-* */
export const dismissData = (view: DismissView) => ({
    'data-pressing': view.pressing || undefined,
    'data-armed': view.armed || undefined,
    'data-dragging': view.dragging || undefined,
    'data-revealed': view.revealed || undefined,
    'data-closing': view.closing || undefined,
    'data-lifted': (view.armed && !view.dragging && !view.revealed && !view.closing) || undefined,
});

/** card 向左移咗幾多：card 同後面「關閉」掣嘅闊度都跟呢個 CSS 變數 */
export const offsetStyle = (view: DismissView) =>
    ({ '--mini-dismiss-offset': `${view.offset}px` }) as CSSProperties;

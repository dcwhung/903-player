import { useEffect } from 'react';

const FOCUS_OPTIONS: FocusOptions = { preventScroll: true };

/**
 * 閒置畫面（9b）出緊：document.body 入面除咗覆蓋層之外全部 inert（app #root 即係底下嗰頁），
 * 讀屏 / Tab / 撳都掂唔到；焦點入覆蓋層嘅叫醒掣。收起時拆返自己加嘅 inert，焦點返原位（同一頁冇轉過）。
 * 本身已經 inert 嘅唔郁（唔係我哋加嘅，唔好幫人拆）
 */
export const useInertBackground = (
    overlay: HTMLElement | null,
    focusTarget: HTMLElement | null,
    active: boolean,
): void => {
    useEffect(() => {
        if (!active || !overlay) return undefined;
        const previous =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const others = Array.from(document.body.children).filter(
            (el) => el !== overlay && !el.hasAttribute('inert'),
        );
        others.forEach((el) => el.setAttribute('inert', ''));
        focusTarget?.focus(FOCUS_OPTIONS);
        return () => {
            others.forEach((el) => el.removeAttribute('inert'));
            if (previous?.isConnected) previous.focus(FOCUS_OPTIONS);
        };
    }, [overlay, focusTarget, active]);
};

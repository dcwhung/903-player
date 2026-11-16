import { useCallback, useEffect, useRef } from 'react';

/** 打開資料 sheet 嗰粒 ⓘ（GaugeInfoRow）：橫版撳佢唔當「撳咗左欄」 */
export const INFO_OPENER_ATTR = 'data-info-opener';
/** 撳落呢啲先當「撳咗左欄嘅掣」；撳空白位 / 純文字唔閂 */
const PRESSABLE_SELECTOR =
    'button, a[href], [role="button"], [role="link"], [role="tab"], [role="option"], input, select, textarea, label, summary';

/** 撳落嘅位唔喺 sheet 入面、唔係 ⓘ，而係落喺掣 / 連結等互動元素 */
const isOutsidePress = (target: EventTarget | null, sheet: HTMLElement | null): boolean => {
    if (!(target instanceof Element) || sheet?.contains(target)) return false;
    if (target.closest(`[${INFO_OPENER_ATTR}]`)) return false;
    return target.closest(PRESSABLE_SELECTOR) !== null;
};

/**
 * 橫版右欄 sheet 冇遮罩：sheet 開住時撳左欄任何掣（集數播放 / 收藏、日子條、短篇 chip、全集、返回…）就閂。
 * 用 capture：掣自己 stopPropagation 都收到；撳 sheet 入面同 ⓘ 唔理
 */
export const useCloseOnOutsidePress = (
    enabled: boolean,
    onClose: () => void,
    setSheet: (el: HTMLElement | null) => void,
) => {
    const sheetRef = useRef<HTMLElement | null>(null);
    // 同 W-747 一樣：caller 每秒 re-render 傳新 onClose，唔好因此重掛 listener
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);
    useEffect(() => {
        if (!enabled) return undefined;
        const onPointerDown = (event: PointerEvent) => {
            if (isOutsidePress(event.target, sheetRef.current)) onCloseRef.current();
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        return () => document.removeEventListener('pointerdown', onPointerDown, true);
    }, [enabled]);
    // 穩定 callback ref（同 useSheetBehaviour 一齊填）：播放時每秒 re-render 唔可以令 useSheetDrag 重掛
    return useCallback(
        (el: HTMLElement | null) => {
            setSheet(el);
            sheetRef.current = el;
        },
        [setSheet],
    );
};

import { useCallback, useEffect, useRef } from 'react';
import { useSheetDrag } from './useSheetDrag';

/** 打開時焦點入表；Escape 收埋；收埋之後焦點返去打開前嗰粒掣 */
const useSheetFocus = (open: boolean, onClose: () => void) => {
    const sheetRef = useRef<HTMLElement>(null);
    useEffect(() => {
        if (!open) return undefined;
        const opener = document.activeElement as HTMLElement | null;
        sheetRef.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            opener?.focus?.();
        };
    }, [open, onClose]);
    return sheetRef;
};

/**
 * 焦點（useSheetFocus）同向下拉閂（useSheetDrag）共用同一張表：
 * 穩定嘅 callback ref 同時填兩邊，唔會每次 render（播放時間每秒更新）重掛
 */
export const useSheetBehaviour = (open: boolean, onClose: () => void) => {
    const sheetRef = useSheetFocus(open, onClose);
    const { sheetRef: bindSheet, ...drag } = useSheetDrag(open, onClose);
    const setSheet = useCallback(
        (el: HTMLElement | null) => {
            sheetRef.current = el;
            bindSheet(el);
        },
        [sheetRef, bindSheet],
    );
    return { setSheet, ...drag };
};

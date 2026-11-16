import { useCallback, useEffect, useRef } from 'react';
import { useSheetDrag } from './useSheetDrag';

/** 打開時焦點入表；Escape 收埋；收埋之後焦點返去打開前嗰粒掣 */
const useSheetFocus = (open: boolean, onClose: () => void) => {
    const sheetRef = useRef<HTMLElement>(null);
    // W-747：onClose 用 ref（同 useCloseTimer 一樣）；caller 每次 render 傳新 function，
    // 播放時每秒 re-render 唔可以重跑 effect，否則 cleanup 將焦點由 sheet 入面扯走
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);
    useEffect(() => {
        if (!open) return undefined;
        const opener = document.activeElement as HTMLElement | null;
        sheetRef.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onCloseRef.current();
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            opener?.focus?.();
        };
    }, [open]);
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

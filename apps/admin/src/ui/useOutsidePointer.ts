/*
 * 撳 popover 以外嘅地方就收起（TimeRoller、DateField 共用）。
 * handler 放 ref（S-839）：caller 每次 render 傳新 inline arrow 都唔使重新 add / remove listener，觸發時用最新嗰個
 */
import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

export const useOutsidePointer = (
    ref: RefObject<HTMLElement | null>,
    active: boolean,
    onOutside: () => void,
) => {
    const handlerRef = useRef(onOutside);
    useLayoutEffect(() => {
        handlerRef.current = onOutside;
    });
    useEffect(() => {
        if (!active) return undefined;
        const onPointerDown = (event: PointerEvent) => {
            if (!ref.current?.contains(event.target as Node)) handlerRef.current();
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [ref, active]);
};

/* 撳 popover 以外嘅地方就收起（TimeRoller、DateField 共用） */
import { useEffect, type RefObject } from 'react';

export const useOutsidePointer = (
    ref: RefObject<HTMLElement | null>,
    active: boolean,
    onOutside: () => void,
) =>
    useEffect(() => {
        if (!active) return undefined;
        const onPointerDown = (event: PointerEvent) => {
            if (!ref.current?.contains(event.target as Node)) onOutside();
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [ref, active, onOutside]);

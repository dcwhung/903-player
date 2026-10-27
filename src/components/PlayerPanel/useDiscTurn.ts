import { useMemo, useRef, type RefObject } from 'react';
import { prefersReducedMotion } from '../../utils/motion';

/**
 * 寫碟面角度（直接寫 style，拖緊唔會每次郁都 re-render）；
 * 減少動畫就清走手動角度（reset / revert 都唔留 rotate），碟面保持正
 */
const write = (el: HTMLElement | null, degrees: number) => {
    if (el) el.style.transform = prefersReducedMotion() ? '' : `rotate(${degrees}deg)`;
};

export interface DiscTurn {
    /** 碟面（Disc 嘅 ref） */
    faceRef: RefObject<HTMLSpanElement | null>;
    /** 由放手嗰個角度再轉 degrees 度 */
    turn: (degrees: number) => void;
    /** 放手：停喺而家角度 */
    settle: () => void;
    /** 轉返正（換咗集、未知時長）：清走之前捽過嘅角度 */
    reset: () => void;
    /** 取消：轉返去起手角度 */
    revert: () => void;
}

/**
 * 碟面嘅手動角度（捽碟 / 拖弧形跟手指轉）：放手停喺原位，下次由嗰度繼續。
 * 自轉係 CSS 嘅 rotate animation（Disc.module.css），同呢度嘅 transform 疊埋計，唔會覆蓋；
 * 日子條轉嘅係入面嘅節目圖，亦係另一層。減少動畫就唔跟轉
 */
export const useDiscTurn = (): DiscTurn => {
    const faceRef = useRef<HTMLSpanElement>(null);
    const base = useRef(0);
    const extra = useRef(0);
    return useMemo(
        () => ({
            faceRef,
            turn: (degrees: number) => {
                if (prefersReducedMotion()) return;
                extra.current = degrees;
                write(faceRef.current, base.current + degrees);
            },
            settle: () => {
                base.current += extra.current;
                extra.current = 0;
            },
            reset: () => {
                base.current = 0;
                extra.current = 0;
                write(faceRef.current, 0);
            },
            revert: () => {
                extra.current = 0;
                write(faceRef.current, base.current);
            },
        }),
        [],
    );
};

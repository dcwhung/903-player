import { useMemo, useRef } from 'react';
import { prefersReducedMotion } from '../../utils/motion';

/** 寫碟面角度（直接寫 style，拖緊唔會每次郁都 re-render） */
const write = (el: HTMLElement | null, degrees: number) => {
    if (el) el.style.transform = `rotate(${degrees}deg)`;
};

/**
 * 碟面嘅手動角度（捽碟 / 拖弧形跟手指轉）：放手停喺原位，下次由嗰度繼續。
 * 自轉係 CSS 嘅 rotate animation（Disc.module.css），同呢度嘅 transform 疊埋計，唔會覆蓋；
 * 日子條轉嘅係入面嘅節目圖，亦係另一層。減少動畫就唔跟轉
 */
export const useDiscTurn = () => {
    const faceRef = useRef<HTMLSpanElement>(null);
    const base = useRef(0);
    const extra = useRef(0);
    return useMemo(
        () => ({
            faceRef,
            /** 由放手嗰個角度再轉 degrees 度 */
            turn: (degrees: number) => {
                if (prefersReducedMotion()) return;
                extra.current = degrees;
                write(faceRef.current, base.current + degrees);
            },
            /** 放手：停喺而家角度 */
            settle: () => {
                base.current += extra.current;
                extra.current = 0;
            },
            /** 轉返正（換咗集、未知時長）：清走之前捽過嘅角度 */
            reset: () => {
                base.current = 0;
                extra.current = 0;
                write(faceRef.current, 0);
            },
            /** 取消：轉返去起手角度 */
            revert: () => {
                extra.current = 0;
                write(faceRef.current, base.current);
            },
        }),
        [],
    );
};

export type DiscTurn = ReturnType<typeof useDiscTurn>;

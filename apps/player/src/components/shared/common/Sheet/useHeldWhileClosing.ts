import { useState } from 'react';

/**
 * 表收埋緊（useSheetPresence 'closing'）用返最後一次開住時嘅值：
 * 有啲父層閂表嗰下就清走內容（例如短篇資料 sheet 嘅 sections），滑走途中唔可以變空白
 */
export const useHeldWhileClosing = <T>(value: T, open: boolean): T => {
    const [held, setHeld] = useState(value);
    // render 期間記低（React 建議做法）；同一個值唔會再 set，唔會無限 render
    if (open && held !== value) setHeld(value);
    return open ? value : held;
};

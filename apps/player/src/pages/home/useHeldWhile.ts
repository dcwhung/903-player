import { useState } from 'react';

/**
 * hold 期間照回傳上一次冇 hold 時嘅 value；一放開就跟返最新。
 * 例如 useCardMotion 等緊瀏覽器影舊畫面：舊版面嘅右邊把手要留喺舊 snapshot 入面，O1 開卡時先淡走
 */
export const useHeldWhile = <T>(value: T, hold: boolean): T => {
    const [held, setHeld] = useState(value);
    // 唔 hold：即刻跟（React「props 變就調整 state」寫法，唔會多一次 commit）
    if (!hold && held !== value) setHeld(value);
    return hold ? held : value;
};

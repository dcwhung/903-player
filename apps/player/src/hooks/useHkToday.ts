import { hkToday, msUntilNextHkMidnight } from '@903-player/catalog';
import { useEffect, useState } from 'react';

/**
 * 香港今日（YYYY-MM-DD），過咗午夜自己轉（S-704）：頁面暫停緊又冇其他 state 變都會 re-render。
 * 午夜用 timer；返回前台再對一次（iOS 背景會凍結 timer，返嚟可能已經過咗午夜）
 */
export const useHkToday = (): string => {
    const [today, setToday] = useState(hkToday);
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const refresh = () => {
            setToday(hkToday());
            clearTimeout(timer);
            timer = setTimeout(refresh, msUntilNextHkMidnight());
        };
        timer = setTimeout(refresh, msUntilNextHkMidnight());
        document.addEventListener('visibilitychange', refresh);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, []);
    return today;
};

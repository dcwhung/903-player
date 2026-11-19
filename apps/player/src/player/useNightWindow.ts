import { useEffect, useState } from 'react';
import { NIGHT_WINDOW_CHECK_MS } from '../config/constants';
import { isNightWindow } from './sleepTimer';

/** 距離下一個分鐘邊界幾耐：21:00 / 05:00 一到就轉，唔使等成分鐘 */
const msToNextMinute = (now: number): number =>
    NIGHT_WINDOW_CHECK_MS - (now % NIGHT_WINDOW_CHECK_MS);

/**
 * 而家係唔係夜間時段（裝置本地時間 21:00–05:00，出月亮掣用）：每分鐘對正分鐘邊界再檢查；
 * 亮返屏幕即刻檢查（背景時 timer 可能冇行過）
 */
export const useNightWindow = (): boolean => {
    const [night, setNight] = useState(() => isNightWindow(new Date()));

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        const check = () => setNight(isNightWindow(new Date()));
        const schedule = () => {
            timeout = setTimeout(() => {
                check();
                schedule();
            }, msToNextMinute(Date.now()));
        };
        check();
        schedule();
        document.addEventListener('visibilitychange', check);
        return () => {
            clearTimeout(timeout);
            document.removeEventListener('visibilitychange', check);
        };
    }, []);

    return night;
};

import { useEffect, useState } from 'react';
import { msToNextMinute } from '../utils/clock';

/**
 * 閒置畫面（9b）嘅時鐘：而家（裝置本地時間），每到分鐘邊界先 re-render 一次（唔使逐秒行）；
 * 亮返屏幕即刻對一次（背景時 timer 可能冇行過），同 useNightWindow 一樣
 */
export const useMinuteClock = (): Date => {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        const tick = () => {
            setNow(new Date());
            clearTimeout(timeout);
            timeout = setTimeout(tick, msToNextMinute(Date.now()));
        };
        timeout = setTimeout(tick, msToNextMinute(Date.now()));
        document.addEventListener('visibilitychange', tick);
        return () => {
            clearTimeout(timeout);
            document.removeEventListener('visibilitychange', tick);
        };
    }, []);

    return now;
};

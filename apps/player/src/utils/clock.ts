import { MS_PER_MINUTE } from '../config/constants';
import { t } from '../i18n/t';
import { WEEKDAYS } from '../i18n/zh-HK';

const CLOCK_PART_WIDTH = 2;

const pad = (value: number): string => String(value).padStart(CLOCK_PART_WIDTH, '0');

/**
 * 閒置畫面（9b）嘅時間：裝置本地時間 24 小時「22:30」。
 * 用本地時間（唔係香港時區），同 9d 夜間時段（useNightWindow）一致
 */
export const formatClock = (now: Date): string => `${pad(now.getHours())}:${pad(now.getMinutes())}`;

/** 閒置畫面時間下面嘅日子：「11月30日 星期一」（裝置本地時間，月日唔補 0） */
export const formatClockDate = (now: Date): string =>
    t('ambient.date', {
        month: now.getMonth() + 1,
        day: now.getDate(),
        weekday: t('dates.weekday', { weekday: WEEKDAYS[now.getDay()] ?? '' }),
    });

/** 距離下一個分鐘邊界幾耐（啱啱喺邊界就等成分鐘）：時鐘對正分鐘跳，唔會遲成分鐘先轉 */
export const msToNextMinute = (now: number): number => MS_PER_MINUTE - (now % MS_PER_MINUTE);

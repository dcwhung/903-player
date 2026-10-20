import type { ShowId } from '../types/recording';
import type { Weekday } from '../types/weekday';

export interface ShowConfig {
    id: ShowId;
    /** 原站 `?show=` 參數，亦係顯示名稱 */
    name: string;
    /** 原站錄音檔名嘅 HHMM（每個節目固定），用嚟喺 app 度直接砌錄音網址 */
    fileTime: string;
    /** 逢星期幾播（0 = 星期日 … 6 = 星期六），唔播嘅日子唔使 probe */
    airDays: readonly Weekday[];
}

const MONDAY_TO_FRIDAY: readonly Weekday[] = [1, 2, 3, 4, 5];
const SATURDAY: readonly Weekday[] = [6];

export const SHOWS: readonly ShowConfig[] = [
    { id: 'badgirl', name: 'Bad Girl大過佬', fileTime: '1009', airDays: MONDAY_TO_FRIDAY },
    { id: 'gongzi', name: '公子會', fileTime: '2308', airDays: SATURDAY },
    { id: 'wanni', name: '雲妮鍾情', fileTime: '0708', airDays: MONDAY_TO_FRIDAY },
    { id: 'sunnyday', name: '在晴朗的一天出發', fileTime: '0809', airDays: MONDAY_TO_FRIDAY },
    { id: 'westair', name: '西加航空', fileTime: '0905', airDays: SATURDAY },
    { id: 'waves', name: '口水多過浪花', fileTime: '1510', airDays: MONDAY_TO_FRIDAY },
    { id: 'lalala', name: '聖艾粒LaLaLaLa', fileTime: '1710', airDays: MONDAY_TO_FRIDAY },
];

export const findShow = (id: string): ShowConfig | undefined =>
    SHOWS.find((show) => show.id === id);

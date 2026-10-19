import type { ShowId } from '../types/recording';

export interface ShowConfig {
    id: ShowId;
    /** 原站 `?show=` 參數，亦係顯示名稱 */
    name: string;
}

export const SHOWS: readonly ShowConfig[] = [
    { id: 'badgirl', name: 'Bad Girl大過佬' },
    { id: 'gongzi', name: '公子會' },
    { id: 'wanni', name: '雲妮鍾情' },
    { id: 'sunnyday', name: '在晴朗的一天出發' },
    { id: 'westair', name: '西加航空' },
];

export const findShow = (id: string): ShowConfig | undefined =>
    SHOWS.find((show) => show.id === id);

import type { ShowId } from '../types/recording';

export interface ShowConfig {
    id: ShowId;
    /** 原站 `?show=` 參數，亦係顯示名稱 */
    name: string;
    /** 原站其他寫法（例如異體字），用嚟比對 badge / 檔名 */
    aliases?: readonly string[];
    /** 原站錄音檔名嘅 HHMM（每個節目固定），用嚟喺 app 度直接砌錄音網址 */
    fileTime: string;
}

export const SHOWS: readonly ShowConfig[] = [
    { id: 'badgirl', name: 'Bad Girl大過佬', fileTime: '1009' },
    { id: 'gongzi', name: '公子會', fileTime: '2308' },
    { id: 'wanni', name: '雲妮鍾情', aliases: ['雲妮鐘情'], fileTime: '0708' },
    { id: 'sunnyday', name: '在晴朗的一天出發', fileTime: '0809' },
    { id: 'westair', name: '西加航空', fileTime: '0905' },
];

/** 比對節目名前統一寫法：全形半形、大細楷、空格同底線（檔名用 Bad_Girl） */
const normaliseShowName = (name: string): string =>
    name
        .normalize('NFKC')
        .replace(/[\s_]+/g, '')
        .toLowerCase();

const SHOW_BY_NAME = new Map(
    SHOWS.flatMap((show) =>
        [show.name, ...(show.aliases ?? [])].map(
            (name) => [normaliseShowName(name), show] as const,
        ),
    ),
);

export const findShow = (id: string): ShowConfig | undefined =>
    SHOWS.find((show) => show.id === id);

export const findShowByName = (name: string): ShowConfig | undefined =>
    SHOW_BY_NAME.get(normaliseShowName(name));

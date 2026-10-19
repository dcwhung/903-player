import type { ShowId } from '../types/recording';

export interface ShowConfig {
    id: ShowId;
    /** 原站 `?show=` 參數，亦係顯示名稱 */
    name: string;
    /** 原站其他寫法（例如異體字），用嚟比對 badge / 檔名 */
    aliases?: readonly string[];
}

export const SHOWS: readonly ShowConfig[] = [
    { id: 'badgirl', name: 'Bad Girl大過佬' },
    { id: 'gongzi', name: '公子會' },
    { id: 'wanni', name: '雲妮鍾情', aliases: ['雲妮鐘情'] },
    { id: 'sunnyday', name: '在晴朗的一天出發' },
    { id: 'westair', name: '西加航空' },
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

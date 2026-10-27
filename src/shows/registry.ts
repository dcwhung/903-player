/*
 * 節目 registry：由 FolderSource 讀每個 folder → 驗 schema → 砌 ShowConfig（連色調同圖）。
 * 所有 lookup 都有明確 fallback（唔靠 closed union），加節目唔使改呢度。
 */
import type { Folder, FolderSource } from '../catalog/folderSource';
import { compareOrderThenId } from '../catalog/ordering';
import { SchemaError } from '../catalog/reader';
import { NEUTRAL_THEME, type ShowTheme } from '../config/showThemes';
import type { Weekday } from '../types/weekday';
import { parseShowDefinition } from './schema';

export interface ShowConfig {
    id: string;
    /** 原站 `?show=` 參數，亦係顯示名稱 */
    name: string;
    /** 原站錄音檔名嘅 HHMM（每個節目固定），用嚟喺 app 度直接砌錄音網址 */
    fileTime: string;
    /** 逢星期幾播（0 = 星期日 … 6 = 星期六），唔播嘅日子唔使 probe */
    airDays: readonly Weekday[];
    /** 節目色調 + 碟面圖 */
    theme: ShowTheme;
    /** 主頁節目格用嘅 16:9 圖 */
    tileArt: string;
}

export interface ShowRegistry {
    /** 全部節目，按主頁次序 */
    shows: readonly ShowConfig[];
    findShow(id: string): ShowConfig | undefined;
    /** 唔識 / 冇 id → NEUTRAL_THEME */
    themeFor(showId: string | undefined): ShowTheme;
}

/** 一星期得一日播（例如逢星期六）：日子條只排有集數嘅日子，唔顯示灰色日子 */
const WEEKLY_AIR_DAY_COUNT = 1;

export const airsWeekly = (show: ShowConfig): boolean =>
    show.airDays.length === WEEKLY_AIR_DAY_COUNT;

const requireImage = (folder: Folder, file: string): string => {
    const url = folder.images[file];
    if (url === undefined) throw new SchemaError(`${folder.source}: no file ${file} in the folder`);
    return url;
};

const toShow = (folder: Folder): { show: ShowConfig; order: number | undefined } => {
    const def = parseShowDefinition(folder.definition, {
        id: folder.id,
        source: folder.source,
        files: new Set(Object.keys(folder.images)),
    });
    return {
        show: {
            id: folder.id,
            name: def.name,
            fileTime: def.fileTime,
            airDays: def.airDays,
            theme: { ...def.theme, art: requireImage(folder, def.disc) },
            tileArt: requireImage(folder, def.tile),
        },
        order: def.order,
    };
};

const indexShows = (source: FolderSource): Map<string, ShowConfig> => {
    const shows = new Map<string, ShowConfig>();
    source
        .folders()
        .map(toShow)
        .sort((a, b) => compareOrderThenId({ ...a, id: a.show.id }, { ...b, id: b.show.id }))
        .forEach(({ show }) => {
            if (shows.has(show.id)) throw new SchemaError(`duplicate show id ${show.id}`);
            shows.set(show.id, show);
        });
    return shows;
};

export const buildShowRegistry = (source: FolderSource): ShowRegistry => {
    const byId = indexShows(source);
    return {
        shows: [...byId.values()],
        findShow: (id) => byId.get(id),
        themeFor: (showId) => (showId ? byId.get(showId)?.theme : undefined) ?? NEUTRAL_THEME,
    };
};

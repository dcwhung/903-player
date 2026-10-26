/*
 * 劇集 registry：由 DramaSource 讀每個 folder → 驗 schema → 展開集數 → 砌 theme。
 * 所有 lookup 都有明確 fallback（唔靠 closed union），加劇唔使改呢度。
 */
import { NEUTRAL_THEME, type ShowTheme } from '../config/showThemes';
import type { DramaEpisode, DramaKind, DailyEpisode, SeriesEpisode } from '../types/drama';
import { buildEpisodes } from './episodes';
import { DramaSchemaError, parseDramaDefinition, type DramaDefinition } from './schema';
import type { DramaFolder, DramaSource } from './source';

export interface Drama {
    id: string;
    /** 顯示名稱（頁頭、mini player、鎖屏） */
    name: string;
    kind: DramaKind;
    /** 停用：主頁唔出、劇集頁當搵唔到（folder 照留，之後改返 true 就得） */
    enabled: boolean;
    /** 短篇劇集主頁角落點數：season →「全 N 季」；冇就「N 個短篇」 */
    arcUnit?: 'season';
    /** 劇集色調 + 碟面圖 */
    theme: ShowTheme;
    /** 主頁劇集格用嘅原圖（16:9，已經有劇名） */
    tileArt: string;
}

/** 舊名，consumer 繼續用得 */
export type DramaConfig = Drama;

export interface DramaRegistry {
    /** 全部劇集（包括停用咗嘅），按顯示次序 */
    dramas: readonly Drama[];
    /** 主頁「廣播劇」tab 列出嘅劇集 */
    enabledDramas(): readonly Drama[];
    /** 劇名（mini player / 鎖屏用）：停用咗都搵到 */
    findDrama(id: string): Drama | undefined;
    /** 劇集頁用：停用咗嘅當搵唔到 */
    findEnabledDrama(id: string): Drama | undefined;
    /** 某套劇全部集數；唔識嘅 id 回傳空 */
    dramaEpisodesOf(id: string): readonly DramaEpisode[];
    seriesEpisodesOf(id: string): SeriesEpisode[];
    dailyEpisodesOf(id: string): DailyEpisode[];
    /** 唔識 / 冇 id → NEUTRAL_THEME */
    dramaThemeFor(id: string | undefined): ShowTheme;
    /** 某集嘅碟面：短篇有自己圖就用，冇就用劇集圖，再冇就空字串 */
    dramaArtFor(episode: DramaEpisode): string;
    /** 播緊某集時嘅色調：劇集色調 + 嗰集嘅碟面 */
    dramaEpisodeTheme(episode: DramaEpisode): ShowTheme;
}

interface DramaEntry {
    drama: Drama;
    episodes: readonly DramaEpisode[];
    arcArt: ReadonlyMap<string, string>;
}

/** 冇寫 order 嘅排最後（再按 id 排） */
const UNORDERED = Number.POSITIVE_INFINITY;

const requireImage = (folder: DramaFolder, file: string): string => {
    const url = folder.images[file];
    if (url === undefined)
        throw new DramaSchemaError(`${folder.source}: no file ${file} in the folder`);
    return url;
};

const toDrama = (folder: DramaFolder, def: DramaDefinition): Drama => ({
    id: folder.id,
    name: def.name,
    kind: def.kind,
    enabled: def.enabled,
    ...(def.arcUnit ? { arcUnit: def.arcUnit } : {}),
    theme: { ...def.theme, art: requireImage(folder, def.disc) },
    tileArt: requireImage(folder, def.tile),
});

const arcArtOf = (folder: DramaFolder, def: DramaDefinition): ReadonlyMap<string, string> =>
    new Map(
        def.kind === 'series'
            ? def.arcs
                  .filter((arc) => arc.disc)
                  .map((arc) => [arc.name, requireImage(folder, arc.disc ?? '')])
            : [],
    );

const toEntry = (folder: DramaFolder): { entry: DramaEntry; order: number } => {
    const def = parseDramaDefinition(folder.definition, {
        id: folder.id,
        source: folder.source,
        files: new Set(Object.keys(folder.images)),
    });
    return {
        entry: {
            drama: toDrama(folder, def),
            episodes: buildEpisodes(folder.id, def),
            arcArt: arcArtOf(folder, def),
        },
        order: def.order ?? UNORDERED,
    };
};

const byOrderThenId = (
    a: { order: number; entry: DramaEntry },
    b: { order: number; entry: DramaEntry },
) => a.order - b.order || a.entry.drama.id.localeCompare(b.entry.drama.id);

const indexEntries = (source: DramaSource): Map<string, DramaEntry> => {
    const entries = new Map<string, DramaEntry>();
    source
        .folders()
        .map(toEntry)
        .sort(byOrderThenId)
        .forEach(({ entry }) => {
            const { id } = entry.drama;
            if (entries.has(id)) throw new DramaSchemaError(`duplicate drama id ${id}`);
            entries.set(id, entry);
        });
    return entries;
};

export const buildRegistry = (source: DramaSource): DramaRegistry => {
    const entries = indexEntries(source);
    const dramas = [...entries.values()].map((e) => e.drama);
    const enabled = dramas.filter((d) => d.enabled);
    const episodesOf = (id: string) => entries.get(id)?.episodes ?? [];
    const artFor = (episode: DramaEpisode): string => {
        const entry = entries.get(episode.dramaId);
        const arcArt = episode.kind === 'series' ? entry?.arcArt.get(episode.arc) : undefined;
        return arcArt ?? entry?.drama.theme.art ?? NEUTRAL_THEME.art;
    };
    return {
        dramas,
        enabledDramas: () => enabled,
        findDrama: (id) => entries.get(id)?.drama,
        findEnabledDrama: (id) => enabled.find((d) => d.id === id),
        dramaEpisodesOf: episodesOf,
        seriesEpisodesOf: (id) =>
            episodesOf(id).filter((e): e is SeriesEpisode => e.kind === 'series'),
        dailyEpisodesOf: (id) =>
            episodesOf(id).filter((e): e is DailyEpisode => e.kind === 'daily'),
        dramaThemeFor: (id) => (id ? entries.get(id)?.drama.theme : undefined) ?? NEUTRAL_THEME,
        dramaArtFor: artFor,
        dramaEpisodeTheme: (episode) => ({
            ...(entries.get(episode.dramaId)?.drama.theme ?? NEUTRAL_THEME),
            art: artFor(episode),
        }),
    };
};

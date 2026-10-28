/*
 * 劇集 registry：由 DramaSource 讀每個 folder → 驗 schema → 展開集數 → 砌 theme。
 * 所有 lookup 都有明確 fallback（唔靠 closed union），加劇唔使改呢度。
 */
import { NEUTRAL_THEME, type ShowTheme } from '../config/showThemes';
import type { DramaEpisode, DramaKind, DailyEpisode, SeriesEpisode } from '../types/drama';
import { compareOrderThenId } from '../catalog/ordering';
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
    /**
     * 全劇上架日（YYYY-MM-DD）：主頁劇集格排次序用。短篇劇用 drama.json 頂層，冇就用最新短篇嘅
     * addedAt；都冇（或者每日劇）就當最舊
     */
    addedAt?: string;
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
    /** 短篇長方形圖（暫時未用）：冇就 undefined，唔 fallback */
    arcTileFor(dramaId: string, arc: string): string | undefined;
}

interface DramaEntry {
    drama: Drama;
    episodes: readonly DramaEpisode[];
    arcArt: ReadonlyMap<string, string>;
    arcTiles: ReadonlyMap<string, string>;
}

const requireImage = (folder: DramaFolder, file: string): string => {
    const url = folder.images[file];
    if (url === undefined)
        throw new DramaSchemaError(`${folder.source}: no file ${file} in the folder`);
    return url;
};

/** 短篇劇嘅上架日：頂層先，冇就最新短篇（YYYY-MM-DD 用字串比較就得）；每日劇冇 */
const addedAtOf = (def: DramaDefinition): string | undefined => {
    if (def.kind !== 'series') return undefined;
    const arcDates = def.arcs.flatMap((arc) => arc.addedAt ?? []);
    return def.addedAt ?? arcDates.sort().at(-1);
};

const toDrama = (folder: DramaFolder, def: DramaDefinition): Drama => {
    const addedAt = addedAtOf(def);
    return {
        id: folder.id,
        name: def.name,
        kind: def.kind,
        enabled: def.enabled,
        ...(def.arcUnit ? { arcUnit: def.arcUnit } : {}),
        ...(addedAt ? { addedAt } : {}),
        theme: { ...def.theme, art: requireImage(folder, def.disc) },
        tileArt: requireImage(folder, def.tile),
    };
};

const arcImagesOf = (
    folder: DramaFolder,
    def: DramaDefinition,
    field: 'disc' | 'tile',
): ReadonlyMap<string, string> =>
    new Map(
        def.kind === 'series'
            ? def.arcs
                  .filter((arc) => arc[field])
                  .map((arc) => [arc.name, requireImage(folder, arc[field] ?? '')])
            : [],
    );

const toEntry = (folder: DramaFolder): { entry: DramaEntry; order: number | undefined } => {
    const def = parseDramaDefinition(folder.definition, {
        id: folder.id,
        source: folder.source,
        files: new Set(Object.keys(folder.images)),
    });
    return {
        entry: {
            drama: toDrama(folder, def),
            episodes: buildEpisodes(folder.id, def),
            arcArt: arcImagesOf(folder, def, 'disc'),
            arcTiles: arcImagesOf(folder, def, 'tile'),
        },
        order: def.order,
    };
};

const indexEntries = (source: DramaSource): Map<string, DramaEntry> => {
    const entries = new Map<string, DramaEntry>();
    source
        .folders()
        .map(toEntry)
        .sort((a, b) =>
            compareOrderThenId({ ...a, id: a.entry.drama.id }, { ...b, id: b.entry.drama.id }),
        )
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
        arcTileFor: (dramaId, arc) => entries.get(dramaId)?.arcTiles.get(arc),
    };
};

/*
 * 劇集 registry：由 DramaSource 讀每個 folder → 驗 schema → 展開集數 → 砌 theme。
 * 所有 lookup 都有明確 fallback（唔靠 closed union），加劇唔使改呢度。
 */
import { NEUTRAL_THEME, type ShowTheme } from '../showTheme';
import type {
    ArcAvailability,
    DramaEpisode,
    DramaKind,
    DailyEpisode,
    SeriesEpisode,
} from '../types/drama';
import { hkToday } from '../date';
import { compareOrderThenId } from '../core/ordering';
import { arcAvailabilityOf, isLiveEpisode, windowStatus, type DramaStatus } from './availability';
import { isArcEnabled } from './arcLabel';
import { buildEpisodes, type EpisodeBuildOptions } from './episodes';
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
    /** 劇集層 addedAt（短篇劇、每日劇都有）：將來日子 = 整套即將上架（主頁書架最尾灰格、劇集頁打唔開） */
    launchedAt?: string;
    /** 劇集層 removedAt：當日起成套劇唔再提供（劇集頁 URL 返主頁） */
    removedAt?: string;
    /** 劇集色調 + 碟面圖 */
    theme: ShowTheme;
    /** 主頁劇集格用嘅原圖（16:9，已經有劇名） */
    tileArt: string;
}

/** 舊名，consumer 繼續用得 */
export type DramaConfig = Drama;

export type { DramaStatus } from './availability';

/**
 * 以下 today 一律預設 hkToday()：未上架 / 已下架嘅集數同劇集唔會出（唔 probe、唔入續播、自動播、最近收聽），
 * 每次叫都重新判斷，過咗香港午夜自動轉
 */
export interface DramaRegistry {
    /** 全部劇集（包括停用咗嘅），按顯示次序 */
    dramas: readonly Drama[];
    /** 主頁「廣播劇」tab 列出嘅劇集（開咗、已上架、未下架） */
    enabledDramas(today?: string): readonly Drama[];
    /** 開咗但整套未上架：主頁書架最尾嘅灰格 */
    upcomingDramas(today?: string): readonly Drama[];
    /** 劇集頁用：今日有得聽 / 未上架 / 已下架 / 搵唔到（停用當搵唔到） */
    dramaStatus(id: string, today?: string): DramaStatus;
    /** 劇名（mini player / 鎖屏用）：停用咗都搵到 */
    findDrama(id: string): Drama | undefined;
    /** 劇集頁用：停用咗嘅當搵唔到 */
    findEnabledDrama(id: string): Drama | undefined;
    /** 某套劇今日有得聽嘅集數；唔識嘅 id 回傳空 */
    dramaEpisodesOf(id: string, today?: string): readonly DramaEpisode[];
    seriesEpisodesOf(id: string, today?: string): SeriesEpisode[];
    dailyEpisodesOf(id: string, today?: string): DailyEpisode[];
    /** catalog 入面全部集數（唔理上架 / 下架）：續聽嗰集下架咗就跳去下一集用 */
    catalogEpisodesOf(id: string): readonly DramaEpisode[];
    /** catalog 入面嘅一集（用 episode ID 搵，唔理上架 / 下架）：收藏 tab 出「已下架」行用 */
    catalogEpisodeOf(id: string, episodeId: string): DramaEpisode | undefined;
    /** 每個短篇嘅上架 / 下架資料（即將上架、快將下架 UI 用） */
    arcAvailabilityOf(id: string): readonly ArcAvailability[];
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
    arcs: readonly ArcAvailability[];
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
    const arcDates = def.arcs.filter(isArcEnabled).flatMap((arc) => arc.addedAt ?? []);
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
        ...(def.addedAt ? { launchedAt: def.addedAt } : {}),
        ...(def.removedAt ? { removedAt: def.removedAt } : {}),
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

const toEntry = (
    folder: DramaFolder,
    options: EpisodeBuildOptions,
): { entry: DramaEntry; order: number | undefined } => {
    const def = parseDramaDefinition(folder.definition, {
        id: folder.id,
        source: folder.source,
        files: new Set(Object.keys(folder.images)),
    });
    return {
        entry: {
            drama: toDrama(folder, def),
            episodes: buildEpisodes(folder.id, def, options),
            arcArt: arcImagesOf(folder, def, 'disc'),
            arcTiles: arcImagesOf(folder, def, 'tile'),
            arcs: arcAvailabilityOf(def),
        },
        order: def.order,
    };
};

const indexEntries = (
    source: DramaSource,
    options: EpisodeBuildOptions,
): Map<string, DramaEntry> => {
    const entries = new Map<string, DramaEntry>();
    source
        .folders()
        .map((folder) => toEntry(folder, options))
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

/** 按今日篩：開咗嘅劇、集數 */
const liveLookups = (entries: ReadonlyMap<string, DramaEntry>, enabled: readonly Drama[]) => {
    const statusOf = (id: string, today = hkToday()): DramaStatus => {
        const drama = enabled.find((d) => d.id === id);
        return drama ? windowStatus(drama, today) : 'missing';
    };
    const episodesOf = (id: string, today = hkToday()): readonly DramaEpisode[] => {
        const entry = entries.get(id);
        if (!entry) return [];
        return entry.episodes.filter((e) => isLiveEpisode(e, entry.drama, today));
    };
    return {
        statusOf,
        episodesOf,
        enabledDramas: (today = hkToday()) =>
            enabled.filter((d) => statusOf(d.id, today) === 'live'),
        upcomingDramas: (today = hkToday()) =>
            enabled.filter((d) => statusOf(d.id, today) === 'upcoming'),
    };
};

/** 碟面 / 色調 lookup */
const artLookups = (entries: ReadonlyMap<string, DramaEntry>) => {
    const artFor = (episode: DramaEpisode): string => {
        const entry = entries.get(episode.dramaId);
        const arcArt = episode.kind === 'series' ? entry?.arcArt.get(episode.arc) : undefined;
        return arcArt ?? entry?.drama.theme.art ?? NEUTRAL_THEME.art;
    };
    return {
        dramaThemeFor: (id: string | undefined) =>
            (id ? entries.get(id)?.drama.theme : undefined) ?? NEUTRAL_THEME,
        dramaArtFor: artFor,
        dramaEpisodeTheme: (episode: DramaEpisode) => ({
            ...(entries.get(episode.dramaId)?.drama.theme ?? NEUTRAL_THEME),
            art: artFor(episode),
        }),
        arcTileFor: (dramaId: string, arc: string) => entries.get(dramaId)?.arcTiles.get(arc),
    };
};

/** options.appAudioBase：host: app 嘅錄音 base（見 EpisodeBuildOptions） */
export const buildRegistry = (source: DramaSource, options: EpisodeBuildOptions): DramaRegistry => {
    const entries = indexEntries(source, options);
    const dramas = [...entries.values()].map((e) => e.drama);
    const enabled = dramas.filter((d) => d.enabled);
    const live = liveLookups(entries, enabled);
    return {
        dramas,
        enabledDramas: live.enabledDramas,
        upcomingDramas: live.upcomingDramas,
        dramaStatus: live.statusOf,
        findDrama: (id) => entries.get(id)?.drama,
        findEnabledDrama: (id) => enabled.find((d) => d.id === id),
        dramaEpisodesOf: live.episodesOf,
        seriesEpisodesOf: (id, today) =>
            live.episodesOf(id, today).filter((e): e is SeriesEpisode => e.kind === 'series'),
        dailyEpisodesOf: (id, today) =>
            live.episodesOf(id, today).filter((e): e is DailyEpisode => e.kind === 'daily'),
        catalogEpisodesOf: (id) => entries.get(id)?.episodes ?? [],
        catalogEpisodeOf: (id, episodeId) =>
            entries.get(id)?.episodes.find((e) => e.id === episodeId),
        arcAvailabilityOf: (id) => entries.get(id)?.arcs ?? [],
        ...artLookups(entries),
    };
};

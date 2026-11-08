/*
 * @903-player/catalog public API：劇集 / 節目資料嘅純邏輯（schema 驗證、registry、上架 / 下架、episode ID）。
 * 唔掂 DOM、唔用 Vite 嘅 import.meta.glob；資料點樣攞（FolderSource）由用家（player / 將來 backend）提供。
 * 例外：dramas/episodes.ts 仲用 import.meta.env.BASE_URL（host: 'app'），Phase 2 改做參數注入
 */
export { DRAMA_AUDIO_BASE, HK_TIMEZONE, LEAVING_SOON_DAYS } from './constants';
export {
    addDays,
    daysBetween,
    hkToday,
    isCalendarDate,
    msUntilNextHkMidnight,
    splitIsoDate,
    weekdayOf,
} from './date';
export { NEUTRAL_THEME, type ShowTheme } from './showTheme';
export type {
    ArcAvailability,
    DailyEpisode,
    DramaEpisode,
    DramaId,
    DramaKind,
    EpisodeRange,
    SeriesEpisode,
} from './types/drama';
export type { Weekday } from './types/weekday';

export { dailyEpisodeId, EPISODE_ID_KIND, seriesEpisodeId, showEpisodeId } from './core/episodeId';
export { foldersFromGlobs, type Folder, type FolderSource } from './core/folderSource';
export { compareOrderThenId, type Ordered } from './core/ordering';
export { SchemaError, type ParseContext } from './core/reader';

export {
    CATALOG_SCHEMA_VERSION,
    CatalogDocumentError,
    documentSource,
    isCatalogImageUrl,
    parseCatalogDocument,
    type CatalogDocument,
    type CatalogEntry,
    type CatalogKind,
} from './document/document';

export {
    arcFreshDate,
    arcLeaving,
    dramaLeaving,
    earliestDate,
    isArcUpcoming,
    isAvailable,
    isLeavingSoon,
    isRemoved,
    latestDate,
    leavingRanges,
    nextRelease,
    pendingBatches,
    releasedEpisodes,
    sameRemovalDay,
    upcomingArcs,
    type DateWindow,
    type Leaving,
    type LeavingScope,
    type NextRelease,
    type UpcomingArc,
} from './selectors/availability';

export { buildEpisodes } from './dramas/episodes';
export {
    buildRegistry,
    type Drama,
    type DramaConfig,
    type DramaRegistry,
    type DramaStatus,
} from './dramas/registry';
export {
    DAILY_TOKENS,
    DramaSchemaError,
    parseDramaDefinition,
    SERIES_TOKENS,
    type DramaDefinition,
} from './dramas/schema';
export type { DramaFolder, DramaSource } from './dramas/source';

export {
    airsWeekly,
    buildShowRegistry,
    type ShowConfig,
    type ShowRegistry,
} from './shows/registry';
export { parseShowDefinition, ShowSchemaError, type ShowDefinition } from './shows/schema';

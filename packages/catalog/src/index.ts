/*
 * @903-player/catalog public API：劇集 / 節目資料嘅純邏輯（schema 驗證、registry、上架 / 下架、episode ID）。
 * 唔掂 DOM、唔用 Vite（import.meta.glob / import.meta.env）；資料點樣攞（FolderSource）同 host: app 錄音 base
 *（appAudioBase）由用家（player / backend）提供。
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
export { ID_PATTERN, SchemaError, type ParseContext } from './core/reader';

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
export { localizeDocument } from './document/localize';

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

export { arcLabelOf, isArcEnabled } from './dramas/arcLabel';
export { buildEpisodes, type EpisodeBuildOptions } from './dramas/episodes';
export { toChineseNumeral } from './dramas/filename';
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
export { NAME_LIST_MAX_ITEMS, NAME_MAX_LENGTH, SUMMARY_MAX_LENGTH } from './core/textFields';

export {
    byteOrder,
    coverUrls,
    DAILY_TEMPLATE,
    episodeUrls,
    exampleFileName,
    findSuspicious,
    generateDraft,
    parseEpisodeFileName,
    parseEpisodeNumeral,
    scanListing,
    SERIES_TEMPLATES,
    type ArcScan,
    type ArcSummary,
    type DraftArc,
    type DraftJson,
    type DraftKind,
    type DraftOptions,
    type DraftResult,
    type DramaScan,
    type FolderListing,
    type Issue,
    type IssueLevel,
    type ParsedEpisodeFile,
} from './scan';

export {
    expandSchedule,
    parseScheduleRule,
    ScheduleError,
    type DatesRule,
    type ExpandedSchedule,
    type PeriodicRule,
    type ScheduleArc,
    type ScheduleRule,
} from './schedule';

export * from './admin';

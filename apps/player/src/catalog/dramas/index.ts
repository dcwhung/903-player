/**
 * 廣播劇 public API。資料來自 src/catalog/dramas/library/<id>/drama.json（見 schema.ts）。
 * 加一套劇：新開 folder，放 drama.json + tile.webp + disc.webp（+ 短篇碟面 / 短篇長方形圖），唔使改 code。
 */
import { bundledSource } from './lib/bundledSource';
import { buildRegistry } from './lib/registry';

export type { Drama, DramaConfig, DramaStatus } from './lib/registry';
export { DramaSchemaError } from './lib/schema';

const REGISTRY = buildRegistry(bundledSource);

export const DRAMAS = REGISTRY.dramas;
export const {
    enabledDramas,
    upcomingDramas,
    dramaStatus,
    findDrama,
    findEnabledDrama,
    dramaEpisodesOf,
    seriesEpisodesOf,
    dailyEpisodesOf,
    catalogEpisodesOf,
    catalogEpisodeOf,
    arcAvailabilityOf,
    dramaThemeFor,
    dramaArtFor,
    dramaEpisodeTheme,
    arcTileFor,
} = REGISTRY;

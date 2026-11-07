/**
 * 廣播劇 public API。資料來自 src/catalog/dramas/library/<id>/drama.json（見 schema.ts）。
 * 加一套劇：新開 folder，放 drama.json + tile.webp + disc.webp（+ 短篇碟面 / 短篇長方形圖），唔使改 code。
 */
import { buildRegistry } from '@903-player/catalog';
import { bundledSource } from './lib/bundledSource';

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

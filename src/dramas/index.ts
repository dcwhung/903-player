/**
 * 廣播劇 public API。資料來自 src/dramas/<id>/drama.json（見 schema.ts）。
 * 加一套劇：新開 folder，放 drama.json + tile.webp + disc.webp（+ 短篇碟面），唔使改 code。
 */
import { bundledSource } from './bundledSource';
import { buildRegistry } from './registry';

export type { Drama, DramaConfig } from './registry';
export { DramaSchemaError } from './schema';

const REGISTRY = buildRegistry(bundledSource);

export const DRAMAS = REGISTRY.dramas;
export const {
    enabledDramas,
    findDrama,
    findEnabledDrama,
    dramaEpisodesOf,
    seriesEpisodesOf,
    dailyEpisodesOf,
    dramaThemeFor,
    dramaArtFor,
    dramaEpisodeTheme,
} = REGISTRY;

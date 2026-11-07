/**
 * 廣播劇 public API。資料來自 src/catalog/dramas/library/<id>/drama.json（見 schema.ts），
 * 或者（VITE_CATALOG_URL 有設定時）開 app 時讀到嘅 catalog.json，見 ../runtime.ts。
 * 加一套劇：新開 folder，放 drama.json + tile.webp + disc.webp（+ 短篇碟面 / 短篇長方形圖），唔使改 code。
 *
 * registry 第一次用先 build（唔係 import 時）：main.tsx 要先 initCatalog 揀定今次用邊份 catalog。
 * 所以呢度唔可以有 module-level 嘅值（以前嘅 DRAMAS 常數改咗做 allDramas()），亦唔好喺 import 時叫下面任何 function
 */
import type { Drama, DramaRegistry } from '@903-player/catalog';
import { activeDramaRegistry } from '../runtime';

type Registry = DramaRegistry;

/** 全部劇集（包括停用咗嘅），按顯示次序 */
export const allDramas = (): readonly Drama[] => activeDramaRegistry().dramas;

// 簽名同 DramaRegistry 一樣；optional 嘅 today 傳 undefined 落去，registry 嘅預設值（hkToday()）照用
export const enabledDramas: Registry['enabledDramas'] = (today) =>
    activeDramaRegistry().enabledDramas(today);
export const upcomingDramas: Registry['upcomingDramas'] = (today) =>
    activeDramaRegistry().upcomingDramas(today);
export const dramaStatus: Registry['dramaStatus'] = (id, today) =>
    activeDramaRegistry().dramaStatus(id, today);
export const findDrama: Registry['findDrama'] = (id) => activeDramaRegistry().findDrama(id);
export const findEnabledDrama: Registry['findEnabledDrama'] = (id) =>
    activeDramaRegistry().findEnabledDrama(id);
export const dramaEpisodesOf: Registry['dramaEpisodesOf'] = (id, today) =>
    activeDramaRegistry().dramaEpisodesOf(id, today);
export const seriesEpisodesOf: Registry['seriesEpisodesOf'] = (id, today) =>
    activeDramaRegistry().seriesEpisodesOf(id, today);
export const dailyEpisodesOf: Registry['dailyEpisodesOf'] = (id, today) =>
    activeDramaRegistry().dailyEpisodesOf(id, today);
export const catalogEpisodesOf: Registry['catalogEpisodesOf'] = (id) =>
    activeDramaRegistry().catalogEpisodesOf(id);
export const catalogEpisodeOf: Registry['catalogEpisodeOf'] = (id, episodeId) =>
    activeDramaRegistry().catalogEpisodeOf(id, episodeId);
export const arcAvailabilityOf: Registry['arcAvailabilityOf'] = (id) =>
    activeDramaRegistry().arcAvailabilityOf(id);
export const dramaThemeFor: Registry['dramaThemeFor'] = (id) =>
    activeDramaRegistry().dramaThemeFor(id);
export const dramaArtFor: Registry['dramaArtFor'] = (episode) =>
    activeDramaRegistry().dramaArtFor(episode);
export const dramaEpisodeTheme: Registry['dramaEpisodeTheme'] = (episode) =>
    activeDramaRegistry().dramaEpisodeTheme(episode);
export const arcTileFor: Registry['arcTileFor'] = (dramaId, arc) =>
    activeDramaRegistry().arcTileFor(dramaId, arc);

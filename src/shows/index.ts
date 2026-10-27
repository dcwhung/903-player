/**
 * 903 節目 public API。資料來自 src/shows/<id>/show.json（見 schema.ts）。
 * 加一個節目：新開 folder，放 show.json + tile.webp（16:9）+ disc.webp（正方形），唔使改 code
 * （橫版主頁 grid 寫死 4×2 = 7 個節目 + 今日格，加減節目要一齊改 ShowGrid.module.css）。
 */
import { bundledSource } from './bundledSource';
import { buildShowRegistry } from './registry';

export { airsWeekly, type ShowConfig } from './registry';
export { ShowSchemaError } from './schema';

const REGISTRY = buildShowRegistry(bundledSource);

export const SHOWS = REGISTRY.shows;
export const { findShow, themeFor } = REGISTRY;

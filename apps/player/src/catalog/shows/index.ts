/**
 * 903 節目 public API。資料來自 src/catalog/shows/library/<id>/show.json（見 schema.ts），
 * 或者（VITE_CATALOG_URL 有設定時）開 app 時讀到嘅 catalog.json，見 ../runtime.ts。
 * 加一個節目：新開 folder，放 show.json + tile.webp（16:9）+ disc.webp（正方形），唔使改 code
 * （橫版主頁 grid 寫死 4×2 = 7 個節目 + 今日格，加減節目要一齊改 ShowGrid.module.css）。
 *
 * registry 第一次用先 build（唔係 import 時）：以前嘅 SHOWS 常數改咗做 allShows()，唔好喺 import 時叫
 */
import type { ShowConfig, ShowRegistry } from '@903-player/catalog';
import { activeShowRegistry } from '../runtime';

/** 全部節目，按主頁次序 */
export const allShows = (): readonly ShowConfig[] => activeShowRegistry().shows;
export const findShow: ShowRegistry['findShow'] = (id) => activeShowRegistry().findShow(id);
export const themeFor: ShowRegistry['themeFor'] = (showId) => activeShowRegistry().themeFor(showId);

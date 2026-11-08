/*
 * runtime catalog.json（Backend Phase 1）嘅時限：main thread fetch 同 SW NetworkFirst 共用，
 * vite.config.ts 都 import 呢個檔（所以唔可以掂 build-time global / DOM）。
 */

/** 開 app 時（splash 期間）最多等 catalog.json 幾耐，過咗就用上次 SW cache / 內建資料 */
export const CATALOG_FETCH_TIMEOUT_MS = 1_500;

/**
 * SW 等網絡幾耐就改用 cache：要短過 CATALOG_FETCH_TIMEOUT_MS，網慢時 SW 先有時間將 cache 交返畀 page，
 * 唔會兩邊同時夠鐘、page 白白 fallback 去內建資料（plan 嘅「避免雙重等待」）
 */
export const CATALOG_SW_NETWORK_TIMEOUT_SECONDS = 1;

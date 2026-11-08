/**
 * 由 vite.config.ts 嘅 define 喺 build 時注入：build 環境變數 VITE_CATALOG_URL（e2e mode 有預設）；
 * 冇設定 = 空字串 = runtime catalog 功能關住
 */
declare const __CATALOG_URL__: string;

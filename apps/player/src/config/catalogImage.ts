/**
 * Catalog 圖（節目 / 劇集 / 短篇圖）嘅 <img crossOrigin>（S-764）：flag 開咗就由 Worker 跨 origin 出（有 CORS header），
 * 用 CORS 模式載入，SW 先攞到 status 200（唔係 opaque），catalogCaching.ts 只 cache 200。
 * flag 關（內建圖，同 origin）就冇分別。主頁橫額係 app 內建圖，唔使
 */
export const CATALOG_IMAGE_CROSS_ORIGIN = 'anonymous';

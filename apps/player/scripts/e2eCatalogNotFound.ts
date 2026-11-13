/*
 * S-765：vite preview 係 SPA，冇呢個檔都答 200 + index.html。e2e harness 唔可以改 SW 發嘅 catalog request
 *（會令 Chromium 重裝 SW，S-648），SW 原封不動去 preview 就會將 SPA HTML 寫入 catalog-json cache。
 * e2e mode 嘅 preview 對 catalog folder 底下一律答 404（喺 SPA fallback 之前），同真 hosting 冇呢個檔一樣；
 * NetworkFirst 唔 cache 非 200。e2e/run.mjs 用 --mode e2e 起 preview
 *（S-965：由 vite.config.ts 抽出嚟，行為不變）
 */
import type { Plugin } from 'vite';

const HTTP_NOT_FOUND = 404;

export const e2eCatalogNotFound = (catalogUrl: string): Plugin => {
    const folder = catalogUrl.slice(0, catalogUrl.lastIndexOf('/') + 1);
    return {
        name: 'e2e-catalog-not-found',
        configurePreviewServer: (server) => {
            server.middlewares.use(folder, (_req, res) => {
                res.statusCode = HTTP_NOT_FOUND;
                res.end();
            });
        },
    };
};

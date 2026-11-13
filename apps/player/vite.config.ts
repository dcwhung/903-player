import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig, type ViteUserConfig } from 'vitest/config';
import { brandedPublicDir } from './scripts/brandingIcons.ts';
import { injectBrandingText, loadBranding, manifestText } from './scripts/brandingConfig.ts';
import { catalogRuntimeCaching } from './scripts/catalogCaching.ts';
import { catalogSnapshot } from './scripts/catalogSnapshot.ts';
import { buildSocialTags, resolveSiteUrl } from './scripts/socialMeta.ts';
import { episodeOptionsFor } from './src/catalog/dramas/lib/episodeOptionsFor.ts';
import { LAUNCH_THEME_COLOR } from './src/config/launchTheme.ts';

// GitHub Pages serve 喺 /903-player/；Vercel build 時會注入 VERCEL=1，serve 喺 root
const GITHUB_PAGES_BASE_PATH = '/903-player/';
const ROOT_BASE_PATH = '/';
const BASE_PATH = process.env.VERCEL ? ROOT_BASE_PATH : GITHUB_PAGES_BASE_PATH;
// package.json 係版本嘅唯一來源；build 時注入，唔使 runtime fetch
const PACKAGE_JSON = new URL('./package.json', import.meta.url);
const { version: APP_VERSION } = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')) as {
    version: string;
};

// index.html 啟動畫面嘅版本號（JS 未跑都要顯示，所以喺 HTML 層換）
const APP_VERSION_PLACEHOLDER = '%APP_VERSION%';
const injectAppVersion = (): Plugin => ({
    name: 'inject-app-version',
    transformIndexHtml: (html) => html.replaceAll(APP_VERSION_PLACEHOLDER, APP_VERSION),
});

// 分享預覽嘅 og:url / og:image：要部署網域先寫到，本機 build 就唔加
const injectSocialTags = (): Plugin => ({
    name: 'inject-social-tags',
    transformIndexHtml: () => {
        const siteUrl = resolveSiteUrl(process.env, BASE_PATH);
        return siteUrl ? buildSocialTags(siteUrl) : [];
    },
});

/*
 * runtime catalog.json（Backend Phase 1）：build 環境變數 VITE_CATALOG_URL（亦讀 .env.<mode>）。
 * 冇設定 = 功能關住（production 預設）：__CATALOG_URL__ 係空字串，main.tsx 嗰段 initCatalog 成段剷走，SW 唔加 route。
 * e2e build 預設開：同 origin 路徑，由 e2e harness route（預設 404 → fallback 內建資料，見 e2e/remoteCatalog.mjs）
 */
const E2E_MODE = 'e2e';
const E2E_CATALOG_URL = `${BASE_PATH}e2e-catalog/catalog.json`;
const CONFIG_DIR = new URL('./', import.meta.url).pathname;
const catalogUrlFor = (mode: string): string =>
    loadEnv(mode, CONFIG_DIR, 'VITE_').VITE_CATALOG_URL ||
    (mode === E2E_MODE ? E2E_CATALOG_URL : '');

/*
 * S-765：vite preview 係 SPA，冇呢個檔都答 200 + index.html。e2e harness 唔可以改 SW 發嘅 catalog request
 *（會令 Chromium 重裝 SW，S-648），SW 原封不動去 preview 就會將 SPA HTML 寫入 catalog-json cache。
 * e2e mode 嘅 preview 對 catalog folder 底下一律答 404（喺 SPA fallback 之前），同真 hosting 冇呢個檔一樣；
 * NetworkFirst 唔 cache 非 200。e2e/run.mjs 用 --mode e2e 起 preview
 */
const HTTP_NOT_FOUND = 404;
const e2eCatalogNotFound = (catalogUrl: string): Plugin => {
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

/*
 * Prebuild snapshot（Backend Phase 2b-2）：production build 有 catalog URL 就喺 buildStart 攞最新 publish
 *（連圖）寫去呢度，src/catalog/snapshot/source.ts 包入 bundle；失敗 / e2e / 冇 URL → repo library
 */
const SNAPSHOT_DIR = new URL('./src/catalog/snapshot/data', import.meta.url).pathname;

/*
 * Branding（App 外觀 plan 2026-11-13）：production build 讀 catalog.branding。
 * text → manifest name / short_name / description + index.html title / meta / og（injectBrandingText）；
 * icon → 下載五張 PNG 寫去 branded public 副本（gitignored），改 publicDir 覆蓋內建 icon。
 * loadBranding 自己 fetch catalog（唔靠 catalogSnapshot buildStart 寫嘅檔，嗰個喺 configResolved 之後先行）；
 * 失敗 / e2e / 冇 URL → 用內建值。
 */
const PUBLIC_DIR = new URL('./public', import.meta.url).pathname;
const BRANDED_PUBLIC_DIR = new URL('./node_modules/.tmp/branded-public', import.meta.url).pathname;

export default defineConfig(async ({ command, mode }): Promise<ViteUserConfig> => {
    const catalogUrl = catalogUrlFor(mode);
    const branding = await loadBranding({ url: catalogUrl, command, mode });
    const publicDir =
        branding?.icon &&
        (await brandedPublicDir({
            icon: branding.icon,
            catalogUrl,
            publicDir: PUBLIC_DIR,
            outDir: BRANDED_PUBLIC_DIR,
        }));
    return {
        ...(publicDir ? { publicDir } : {}),
        base: BASE_PATH,
        // Vitest 共用呢份 config，所以測試都睇到同一個 define
        define: {
            __APP_VERSION__: JSON.stringify(APP_VERSION),
            __CATALOG_URL__: JSON.stringify(catalogUrl),
        },
        plugins: [
            react(),
            injectAppVersion(),
            injectSocialTags(),
            injectBrandingText(branding?.text),
            mode === E2E_MODE && catalogUrl.startsWith('/') && e2eCatalogNotFound(catalogUrl),
            catalogSnapshot({
                url: catalogUrl,
                dir: SNAPSHOT_DIR,
                episodeOptions: episodeOptionsFor(BASE_PATH),
            }),
            VitePWA({
                // prompt：新 SW 裝好後喺 waiting 等，由 src/pwa/updateManager 揀播放停咗先換，
                // 避免 autoUpdate 喺收聽途中自動 reload
                registerType: 'prompt',
                includeAssets: ['favicon.png', 'apple-touch-icon.png'],
                manifest: {
                    ...manifestText(branding?.text),
                    lang: 'zh-HK',
                    start_url: BASE_PATH,
                    scope: BASE_PATH,
                    display: 'standalone',
                    // 啟動畫面 / 狀態列：app 喺主頁啟動，用 HOME_THEME.bg（入咗 app 之後由 ThemeScope 跟頁轉）
                    background_color: LAUNCH_THEME_COLOR,
                    theme_color: LAUNCH_THEME_COLOR,
                    icons: [
                        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                        { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
                        {
                            src: 'icon-maskable-512.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'maskable',
                        },
                    ],
                },
                workbox: {
                    // webp：主頁橫額（src/assets/banner.webp），離線都要見到
                    globPatterns: ['**/*.{js,css,html,svg,png,jpg,webp}'],
                    // 唔好自動 skipWaiting：靠 updateSW(true) 發 SKIP_WAITING message 先啟用新 SW。
                    // clientsClaim 只影響第一次安裝（冇舊 SW 時即刻接管頁面），同 autoUpdate 時一樣
                    skipWaiting: false,
                    clientsClaim: true,
                    // 冇 catalog URL 就係 undefined（同 v1.29 一樣唔設定）
                    runtimeCaching: catalogUrl ? catalogRuntimeCaching(catalogUrl) : undefined,
                },
            }),
        ],
        test: {
            globals: true,
            environment: 'jsdom',
            // src/catalog/dramas/lib/bundledSource.ts 用 import.meta.glob 掃劇集 folder；fs cache 按檔案內容 hash，
            // 加新 folder 唔會令 bundledSource.ts 變，會用到 stale 嘅 glob 結果 → 關掉
            fsModuleCache: false,
            setupFiles: ['./tests/animationEvent.ts', './tests/setup.ts'],
            css: { modules: { classNameStrategy: 'non-scoped' } },
            include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
            coverage: {
                provider: 'v8',
                include: ['src/**/*.{ts,tsx}', 'scripts/**/*.ts'],
                exclude: ['src/main.tsx', '**/*.test.{ts,tsx}'],
            },
        },
    };
});

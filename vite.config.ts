import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const BASE_PATH = '/903-player/';
const THEME_COLOR = '#141414';
// package.json 係版本嘅唯一來源；build 時注入，唔使 runtime fetch
const PACKAGE_JSON = new URL('./package.json', import.meta.url);
const { version: APP_VERSION } = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')) as {
    version: string;
};

export default defineConfig({
    base: BASE_PATH,
    // Vitest 共用呢份 config，所以測試都睇到同一個 define
    define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
    plugins: [
        react(),
        VitePWA({
            // prompt：新 SW 裝好後喺 waiting 等，由 src/pwa/updateManager 揀播放停咗先換，
            // 避免 autoUpdate 喺收聽途中自動 reload
            registerType: 'prompt',
            includeAssets: ['favicon.png', 'apple-touch-icon.png'],
            manifest: {
                name: '903 Player',
                short_name: '903 Player',
                lang: 'zh-HK',
                start_url: BASE_PATH,
                scope: BASE_PATH,
                display: 'standalone',
                background_color: THEME_COLOR,
                theme_color: THEME_COLOR,
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
                globPatterns: ['**/*.{js,css,html,svg,png,jpg}'],
                // 唔好自動 skipWaiting：靠 updateSW(true) 發 SKIP_WAITING message 先啟用新 SW。
                // clientsClaim 只影響第一次安裝（冇舊 SW 時即刻接管頁面），同 autoUpdate 時一樣
                skipWaiting: false,
                clientsClaim: true,
                navigateFallbackDenylist: [/^\/903-player\/data\//],
                runtimeCaching: [
                    {
                        // 錄音列表：優先攞最新，離線先用 cache
                        urlPattern: /\/data\/recordings\.json$/,
                        handler: 'NetworkFirst',
                        options: { cacheName: 'recordings-data' },
                    },
                ],
            },
        }),
    ],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        css: { modules: { classNameStrategy: 'non-scoped' } },
        include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,tsx}', 'scripts/**/*.ts'],
            // CLI entry 只係 I/O glue，邏輯已喺 scrape.ts 測試
            exclude: ['src/main.tsx', 'scripts/scrapeCli.ts', '**/*.test.{ts,tsx}'],
        },
    },
});

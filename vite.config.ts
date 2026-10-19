import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const BASE_PATH = '/903-player/';
const THEME_COLOR = '#141414';

export default defineConfig({
    base: BASE_PATH,
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
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

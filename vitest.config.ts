import { defineConfig } from 'vitest/config';

// root `npm test` 一次過跑晒所有 workspace；每個 project 用返自己嘅 config（player / admin：jsdom + Vite plugins，catalog：node，
// api：Worker code 喺 workerd（@cloudflare/vitest-plugin）、scripts 喺 node）
export default defineConfig({
    test: {
        projects: [
            'apps/player',
            'apps/admin',
            'packages/catalog',
            'apps/api/vitest.config.ts',
            'apps/api/vitest.scripts.config.ts',
        ],
        // root `npm run coverage`（S-761）：只揀 player + catalog project（root package.json script 用 --project 揀）。
        // projects 模式下 coverage 只認 root 設定；有 --project 時 include / exclude 係相對「各 project root」match
        //（vitest BaseCoverageProvider.isIncluded），所以 `src/**` 同時包 apps/player/src 同 packages/catalog/src。
        // player 自己 `npm run coverage -w apps/player` 照用 vite.config.ts 嗰份（同一套 pattern）
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,tsx}', 'scripts/**/*.ts'],
            exclude: ['src/main.tsx', '**/*.test.{ts,tsx}', '**/*.d.ts'],
        },
    },
});

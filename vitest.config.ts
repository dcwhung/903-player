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
    },
});

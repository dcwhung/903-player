import { defineConfig } from 'vitest/config';

// root `npm test` 一次過跑晒所有 workspace；每個 project 用返自己嘅 config（player：jsdom + Vite plugins，catalog：node）
export default defineConfig({
    test: {
        projects: ['apps/player', 'packages/catalog'],
    },
});

import { mkdirSync } from 'node:fs';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

/** test 用嘅 secret（真 secret 唔入 repo；production 用 wrangler secret put） */
const TEST_SECRETS = {
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    SESSION_SECRET: 'test-session-secret-0123456789abcdef',
};

/*
 * wrangler.toml [assets] directory = ../admin/dist（admin SPA build 輸出）：資料夾唔存在 wrangler 會報錯，
 * 而 Worker test 唔使真 SPA（/api、/auth、/catalog 都係 run_worker_first），所以冇 build 都開個空資料夾
 */
mkdirSync(new URL('../admin/dist', import.meta.url), { recursive: true });

// Worker code 喺 workerd（miniflare）入面跑：D1 / R2 / Cache API 都係本機模擬，每個 test 檔獨立 storage
export default defineConfig(async () => {
    const migrations = await readD1Migrations(new URL('./migrations', import.meta.url).pathname);
    return {
        plugins: [
            cloudflareTest({
                wrangler: { configPath: './wrangler.toml' },
                miniflare: { bindings: { ...TEST_SECRETS, TEST_MIGRATIONS: migrations } },
            }),
        ],
        test: {
            name: '@903-player/api',
            globals: true,
            include: ['test/**/*.test.ts'],
            setupFiles: ['./test/applyMigrations.ts'],
        },
    };
});

import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/*
 * Admin 同 api 係同一個 Worker deploy（Worker static assets 出 apps/admin/dist），
 * 所以版本 pill 用 apps/api/package.json 嘅 version：一個版本號就夠（plan §3b）
 */
const API_PACKAGE_JSON = new URL('../api/package.json', import.meta.url);
const { version: API_VERSION } = JSON.parse(readFileSync(API_PACKAGE_JSON, 'utf8')) as {
    version: string;
};

/*
 * 本機開發：`npm run dev:admin`（Vite）+ 另一個 terminal `npm run dev -w apps/api`（wrangler dev，https://localhost:8787）。
 * /api、/auth、/catalog 轉去 wrangler dev；Worker 嘅 same-origin 守門要 Origin = WORKER_ORIGIN，所以 proxy 改寫 Origin。
 * Login：先喺 https://localhost:8787 登入（cookie 唔分 port，Vite 頁會帶埋）
 */
const WORKER_DEV_ORIGIN = process.env.ADMIN_API_ORIGIN ?? 'https://localhost:8787';
const PROXIED_PATHS = ['/api', '/auth', '/catalog'];

const proxyEntry = {
    target: WORKER_DEV_ORIGIN,
    // wrangler dev --local-protocol https 用自簽 cert
    secure: false,
    configure: (proxy: { on: (event: 'proxyReq', fn: (req: ProxyRequest) => void) => void }) =>
        proxy.on('proxyReq', (req) => {
            if (req.getHeader('origin')) req.setHeader('origin', WORKER_DEV_ORIGIN);
        }),
};

interface ProxyRequest {
    getHeader: (name: string) => unknown;
    setHeader: (name: string, value: string) => void;
}

export default defineConfig({
    define: {
        __API_VERSION__: JSON.stringify(API_VERSION),
    },
    plugins: [react()],
    server: {
        proxy: Object.fromEntries(PROXIED_PATHS.map((path) => [path, proxyEntry])),
    },
    test: {
        name: '@903-player/admin',
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        include: ['src/**/*.test.{ts,tsx}'],
    },
});

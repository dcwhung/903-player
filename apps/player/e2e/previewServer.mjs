// e2e 用嘅 vite preview：run.mjs（功能 e2e）同 visualDiff.mjs（截圖比對）共用。
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

/** app 嘅 base path（vite.config.ts BASE_PATH） */
export const BASE_PATH = '/903-player/';
/** 等 server 起好：每次隔幾耐、最多試幾多次 */
const POLL_MS = 500;
const POLL_ATTEMPTS = 30;

export const previewUrl = (port) => `http://localhost:${port}${BASE_PATH}`;

/** port 有冇人用緊：有就 reject，唔好 poll 到第二個 worktree 嘅 preview，誤測人哋嘅 build（S-549） */
const assertPortFree = (port) =>
    new Promise((resolve, reject) => {
        const probe = createServer();
        probe.once('error', () =>
            reject(
                new Error(
                    `port ${port} 有人用緊（可能係另一個 worktree 嘅 e2e），用 E2E_PORT 揀第二個`,
                ),
            ),
        );
        probe.listen(port, () => probe.close(resolve));
    });

/**
 * 起 vite preview（--mode e2e），起好先 resolve（回傳 child process，用完自己 kill）。
 * cwd：邊個 app folder 嘅 dist（預設 process.cwd()，即係 apps/player）
 */
export const startPreview = async ({ port, cwd = process.cwd() }) => {
    await assertPortFree(port);
    // 直接用 node 行 vite（唔經 npx），kill 先會停到真正嘅 server
    // npm workspaces 將 vite hoist 去 repo 根嘅 node_modules：由 vite/package.json 位置搵 bin
    const viteBin = new URL('bin/vite.js', import.meta.resolve('vite/package.json')).pathname;
    const server = spawn(
        process.execPath,
        // --mode e2e：同 build 一樣，vite.config.ts 先會對 e2e-catalog/ 答 404、唔做 SPA fallback（S-765）
        [viteBin, 'preview', '--mode', 'e2e', '--port', String(port), '--strictPort'],
        // stderr 照出：vite 起唔到（例如撞 port）時睇到原因（S-850）
        { cwd, stdio: ['ignore', 'ignore', 'inherit'] },
    );
    // 俾 signal 殺咗時 exitCode 係 null、signalCode 先有值，兩樣都要睇（S-850）
    const hasExited = () => server.exitCode !== null || server.signalCode !== null;
    for (let i = 0; i < POLL_ATTEMPTS; i += 1) {
        // vite 自己退出（例如 strictPort 撞 port）就唔使再等
        if (hasExited()) break;
        try {
            if ((await fetch(previewUrl(port))).ok) return server;
        } catch {
            // server 未起好
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
    }
    if (hasExited()) {
        throw new Error(
            `vite preview exited early (code ${server.exitCode}, signal ${server.signalCode}) on port ${port}`,
        );
    }
    server.kill();
    throw new Error('vite preview did not start');
};

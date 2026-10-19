// @vitest-environment node
// 放喺 scripts/：要用 node:fs 讀 CSS（Vitest 會將 CSS 連 ?raw 都處理成空字串），
// 而 Node 型別只屬 tsconfig.node.json，唔會漏入 app 程式（tsconfig.app.json）
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LAUNCH_THEME_COLOR } from '../src/config/launchTheme';

describe('LAUNCH_THEME_COLOR vs tokens.css', () => {
    it('should match the home gradient top token', () => {
        // CSS 唔 import 到 TS 常數，所以用測試鎖住兩邊一致
        // 相對測試檔解析，唔靠 process.cwd()（喺其他目錄 / --root 行都得）
        const tokensPath = fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url));
        const tokensCss = readFileSync(tokensPath, 'utf8');
        const match = /--home-bg-top:\s*(#[0-9a-f]{3,8})\s*;/i.exec(tokensCss);

        expect(match?.[1]).toBe(LAUNCH_THEME_COLOR);
    });
});

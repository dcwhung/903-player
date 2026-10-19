/// <reference types="node" />
// 只有呢個測試要讀檔，所以喺檔案層面加 Node 型別，唔改 tsconfig.app.json
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// ?raw：HTML 由 Vite 直接畀返原始字串（CSS 就唔得，見下面 tokens.css 測試）
import indexHtml from '../../index.html?raw';
import { LAUNCH_THEME_COLOR } from './launchTheme';
import { HOME_THEME } from './showThemes';

describe('LAUNCH_THEME_COLOR', () => {
    it('should equal the home page top colour', () => {
        expect(LAUNCH_THEME_COLOR).toBe(HOME_THEME.bg);
    });

    it('should be the initial theme-color in index.html', () => {
        const doc = new DOMParser().parseFromString(indexHtml, 'text/html');
        const meta = doc.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

        expect(meta?.content).toBe(LAUNCH_THEME_COLOR);
    });

    it('should match the home gradient top token in tokens.css', () => {
        // CSS 唔 import 到 TS 常數，所以用測試鎖住兩邊一致。
        // Vitest 會將 CSS（連 ?raw）處理成空字串，所以直接讀檔（jsdom 下 import.meta.url 唔係 file:，用 repo root）
        const tokensCss = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8');
        const match = /--home-bg-top:\s*(#[0-9a-f]{3,8})\s*;/i.exec(tokensCss);

        expect(match?.[1]).toBe(LAUNCH_THEME_COLOR);
    });
});

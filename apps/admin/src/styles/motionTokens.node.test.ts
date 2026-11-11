// @vitest-environment node
// 要用 node:fs 讀 CSS 原文（Vitest 會將 .css?raw 變做空字串）：*.node.test.ts 行 tsconfig.node.json（有 Node 型別）
/* S-806：動畫 / 過場時間一律用 tokens.css 嘅 --motion-*，唔准 hardcode 秒數 */
import { readFileSync } from 'node:fs';

const cssOf = (name: string) => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');
const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const LITERAL_TIME = /(?:animation|transition)[\w-]*\s*:[^;]*?(?<![\w-])\d*\.?\d+m?s\b/g;

describe('motion tokens in admin CSS', () => {
    it.each(['app.css', 'mockup.css', 'theme.css'])(
        '%s should time animations with --motion-* tokens only',
        (name) => {
            expect(withoutComments(cssOf(name)).match(LITERAL_TIME) ?? []).toEqual([]);
        },
    );
});

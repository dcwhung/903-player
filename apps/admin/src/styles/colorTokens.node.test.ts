// @vitest-environment node
// 要用 node:fs 讀 CSS 原文（Vitest 會將 .css?raw 變做空字串）：*.node.test.ts 行 tsconfig.node.json（有 Node 型別）
/* S-812：theme.css 顏色一律用 tokens.css 嘅 token（--on-nav / --on-primary / --on-sky …），唔准 hardcode hex */
import { readFileSync } from 'node:fs';

const cssOf = (name: string) => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');
const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const HEX_COLOR = /#[0-9a-f]{3,8}\b/gi;

/** :root 第一段（淺色）入面 token 嘅值 */
const lightToken = (name: string) =>
    new RegExp(`${name}:\\s*([^;]+);`).exec(cssOf('tokens.css').split('@media')[0] ?? '')?.[1];

describe('color tokens in admin CSS', () => {
    it('theme.css should not hardcode hex colours', () => {
        expect(withoutComments(cssOf('theme.css')).match(HEX_COLOR) ?? []).toEqual([]);
    });

    it('should keep 新 pill text dark on --sky in both themes (--on-sky is not themed)', () => {
        expect(lightToken('--on-sky')).toBe('#0d1a2b');
        expect(cssOf('tokens.css').match(/--on-sky:/g)).toHaveLength(1);
    });
});

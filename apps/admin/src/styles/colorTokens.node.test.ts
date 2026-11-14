// @vitest-environment node
// 要用 node:fs 讀 CSS 原文（Vitest 會將 .css?raw 變做空字串）：*.node.test.ts 行 tsconfig.node.json（有 Node 型別）
/* S-812：theme.css 顏色一律用 tokens.css 嘅 token（--on-nav / --on-primary / --new-badge-* …），唔准 hardcode hex */
import { readFileSync } from 'node:fs';

const cssOf = (name: string) => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');
const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const HEX_COLOR = /#[0-9a-f]{3,8}\b/gi;

/** :root 第一段（淺色）入面 token 嘅值 */
const lightToken = (name: string) =>
    new RegExp(`${name}:\\s*([^;]+);`).exec(cssOf('tokens.css').split('@media')[0] ?? '')?.[1];

describe('color tokens in admin CSS', () => {
    it.each(['theme.css', 'phase4.css', 'selective.css', 'publish.css', 'publishCards.css'])(
        '%s should not hardcode hex colours',
        (name) => {
            expect(withoutComments(cssOf(name)).match(HEX_COLOR) ?? []).toEqual([]);
        },
    );

    it('should paint the 新 pill like the player NewBadge (red #c0362c, white text, not themed)', () => {
        expect(lightToken('--new-badge-bg')).toBe('#c0362c');
        expect(lightToken('--new-badge-text')).toBe('#ffffff');
        expect(cssOf('tokens.css').match(/--new-badge-bg:/g)).toHaveLength(1);
        expect(withoutComments(cssOf('theme.css'))).toMatch(
            /\.pill\.new\s*\{[^}]*background:\s*var\(--new-badge-bg\)[^}]*color:\s*var\(--new-badge-text\)/,
        );
    });
});

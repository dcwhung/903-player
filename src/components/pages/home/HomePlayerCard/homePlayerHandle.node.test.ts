// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../../../../tests/cssRule';

const tokensCss = readCss(new URL('../../../../styles/tokens.css', import.meta.url));
const cardCss = readCss(new URL('./HomePlayerCard.module.css', import.meta.url));
const status = cssDeclarations(cardCss, '.handleStatus');

const VAR = /var\((--[\w-]+)\)/g;
/** tokens.css 有宣告嘅 custom property 名 */
const DECLARED = new Set([...tokensCss.matchAll(/(--[\w-]+)\s*:/g)].map(([, name]) => name));

describe('把手「已暫停」字眼（P2 #5）', () => {
    it('should only use tokens that tokens.css declares', () => {
        const used = Object.values(status).flatMap((value) =>
            [...value.matchAll(VAR)].map(([, name]) => name),
        );
        expect(used.length).toBeGreaterThan(0);
        expect(used.filter((name) => !DECLARED.has(name))).toEqual([]);
    });

    it('should not shrink, so a long name cannot squeeze the status out', () => {
        expect(status.flex).toBe('none');
        expect(status['writing-mode']).toBe('vertical-rl');
    });
});

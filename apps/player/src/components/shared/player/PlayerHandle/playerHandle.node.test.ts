// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../../../../tests/cssRule';
import { WIDE_BANNER_QUERY } from '../../../../config/layout';

const tokensCss = readCss(new URL('../../../../styles/tokens.css', import.meta.url));
const cardCss = readCss(new URL('./PlayerHandle.module.css', import.meta.url));
const pageCss = readCss(new URL('../../../../pages/shared/Page.module.css', import.meta.url));
const status = cssDeclarations(cardCss, '.handleStatus');
const name = cssDeclarations(cardCss, '.handleName');

const VAR = /var\((--[\w-]+)\)/g;
/** tokens.css 有宣告嘅 custom property 名 */
const DECLARED = new Set([...tokensCss.matchAll(/(--[\w-]+)\s*:/g)].map(([, name]) => name));
const undeclared = (declarations: Record<string, string>) =>
    Object.values(declarations)
        .flatMap((value) => [...value.matchAll(VAR)].map(([, name]) => name))
        .filter((name) => !DECLARED.has(name));

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
    });

    it('should stack the glyphs one per line instead of using vertical-rl', () => {
        // flex: none 嘅直寫元素靠字型 vertical metrics 量高度：冇呢啲 metrics 嘅字型（e2e 擋咗 webfont）量出 0 高
        expect(status['writing-mode']).toBeUndefined();
        expect(status.width).toBe('1em');
        expect(status['overflow-wrap']).toBe('anywhere');
    });

    it('should start the name right under the disc instead of centring it in the spare height', () => {
        // button 預設 text-align: center；直寫時會上下置中，碟同名之間留一大截空位
        expect(name['text-align']).toBe('start');
    });
});

describe('內頁把手（P3 #4）', () => {
    const playing = cssDeclarations(cardCss, ".handleStatus[data-status='playing']");
    const leaving = cssDeclarations(cardCss, '.handle[data-leaving]');

    it('should colour 播放中 in the theme’s playing colour', () => {
        expect(playing.color).toBe('var(--color-status-playing)');
        expect(undeclared(playing)).toEqual([]);
    });

    it('should fade out with a declared duration token before it goes', () => {
        expect(leaving.animation).toMatch(/var\(--duration-page-handle-fade\)/);
        expect(undeclared(leaving)).toEqual([]);
    });

    it('should not animate the fade when the user asks for reduced motion', () => {
        const reduced = cssDeclarations(
            cardCss,
            '.handle[data-leaving]',
            '(prefers-reduced-motion: reduce)',
        );
        expect(reduced.animation).toBe('none');
    });

    it('should always reserve the handle’s room on a wide inner page, so the disc never resizes', () => {
        // 把手出 / 走都唔郁版面：預留位一直喺度（闊橫版先有把手），右欄同唱片大細唔會跟住跳
        const reserve = cssDeclarations(pageCss, '.fixed', WIDE_BANNER_QUERY);
        expect(reserve['padding-right']).toBe(
            'calc(env(safe-area-inset-right) + var(--home-handle-reserve))',
        );
        expect(cssDeclarations(pageCss, '.fixed:has([data-page-handle])')).toEqual({});
    });

    it('should still let the player column fill the row when an inner page has no list', () => {
        // 把手係 main 嘅子元素：唔再用 :only-child，否則載入中有把手時播放器欄只佔右欄
        const fill = cssDeclarations(
            pageCss,
            '.playerColumn:not(:has(~ .listColumn))',
            '(orientation: landscape) and (min-width: 640px)',
        );
        expect(fill['grid-column']).toBe('1 / -1');
    });
});

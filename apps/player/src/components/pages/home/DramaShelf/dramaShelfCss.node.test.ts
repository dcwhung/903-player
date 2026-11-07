// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../../../../tests/cssRule';

const css = readCss(new URL('./DramaShelf.module.css', import.meta.url));

/**
 * 左上角下架字收字（E2 / W-536 / W-538，useHideWhenTight 量度）：
 * 頂行（有繼續收聽）第 2 步 / 單獨角落第 1 步 →「⏳ 19/12 下架」；頂行第 3 步 / 單獨角落第 2 步 →「⏳ 19/12」
 */
const SHORT = ".topBar:has(> .meta[data-tight='2']) .corner, .corner[data-tight='1']";
const BARE = ".topBar:has(> .meta[data-tight='3']) .corner, .corner[data-tight='2']";

/** 逗號分開嘅 selector list 逐個 selector 加後綴 */
const each = (list: string, suffix: string): string =>
    list
        .split(', ')
        .map((selector) => `${selector} ${suffix}`)
        .join(', ');

describe('DramaShelf corner leaving date (E2, W-536, W-538)', () => {
    it('should keep 下架 at the first shrink step: full sentence out, short tag in', () => {
        expect(cssDeclarations(css, each(SHORT, '.noteFull:has(~ .noteNarrow)'))).toEqual({
            display: 'none',
        });
        expect(cssDeclarations(css, each(SHORT, '.noteTag:has(+ .noteNarrow)'))).toEqual({
            display: 'inline',
        });
    });

    it('should show only the bare date at the last step: full and short both out', () => {
        expect(
            cssDeclarations(css, each(BARE, ':is(.noteFull, .noteTag):has(~ .noteNarrow)')),
        ).toEqual({ display: 'none' });
        expect(cssDeclarations(css, each(BARE, '.noteNarrow'))).toEqual({ display: 'inline' });
    });

    // W-538：唔再用 200px container query 一刀切淨日期，改量度
    it('should not cut the corner date by a fixed tile width', () => {
        expect(css).not.toMatch(/@container drama-tile \(max-width: 200px\)/);
    });
});

/*
 * 疊卡填到底（_mockups_/home-fill-bottom C3）：未 focus 嘅卡縮 rest-scale。focus 上面嘅卡由頂縮；
 * focus 下面嘅卡向下移返縮咗嘅高度再縮（= 以卡底做軸心），最尾一張卡底永遠喺書架底。
 * 用 translateY + scale 唔用 transform-origin：focus 轉卡時 transform 順滑過渡，唔會因為 origin 突然換而跳
 */
describe('DramaShelf stack fills to the bottom (C3)', () => {
    const REST = 'scale(var(--drama-shelf-rest-scale))';

    it('should shrink cards above the focus from their top', () => {
        const rest = cssDeclarations(css, '.shelf[data-stacked] .tile');
        expect(rest['transform-origin']).toBe('top center');
        expect(rest.transform).toBe(`translateY(0) ${REST}`);
    });

    it('should shrink cards below the focus towards their bottom edge', () => {
        expect(
            cssDeclarations(css, '.shelf[data-stacked] .tile[data-focused] ~ .tile').transform,
        ).toBe(
            `translateY(calc(var(--drama-shelf-card, 0px) * (1 - var(--drama-shelf-rest-scale)))) ${REST}`,
        );
    });

    it('should keep the focused card full size with the same transform functions', () => {
        expect(cssDeclarations(css, '.shelf[data-stacked] .tile[data-focused]').transform).toBe(
            'translateY(0) scale(1)',
        );
    });
});

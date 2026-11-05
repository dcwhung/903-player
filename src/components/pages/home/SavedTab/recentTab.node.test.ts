// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { atRuleDeclarations, cssDeclarations, readCss } from '../../../../../tests/cssRule';

const css = readCss(new URL('./SavedTab.module.css', import.meta.url));
const tokens = readCss(new URL('../../../../styles/tokens.css', import.meta.url));

const MOTION = '@media (prefers-reduced-motion: no-preference)';
const FADE = 'var(--view-transition-fade) var(--ease-view-transition)';

/** _mockups_/qr-transfer ②：每行 碟 | 名 | 固定闊度 ☆ 欄，☆ 全部上下對齊，長名唔會推走 ☆ */
describe('recent row columns', () => {
    it('should give ☆ a fixed-width column so every star lines up', () => {
        expect(cssDeclarations(css, '.recentRow')['grid-template-columns']).toBe(
            'minmax(0, 1fr) var(--saved-recent-star)',
        );
        expect(cssDeclarations(css, '.recentRow .recentStar')).toMatchObject({
            width: 'var(--saved-recent-star)',
            height: 'var(--saved-recent-star)',
        });
        expect(tokens).toContain('--saved-recent-star: calc(34px * var(--ui-scale));');
    });

    it('should let a long name shrink to … instead of widening the row', () => {
        // overflow 唔係 visible：button 嘅最細闊度唔再跟入面文字（WebKit button 做 grid item）
        expect(cssDeclarations(css, '.recentOpen')).toMatchObject({
            'min-width': '0',
            overflow: 'hidden',
        });
        for (const selector of ['.recentName', '.recentLabel']) {
            expect(cssDeclarations(css, selector)).toMatchObject({
                overflow: 'hidden',
                'text-overflow': 'ellipsis',
                'white-space': 'nowrap',
            });
        }
    });
});

/** B：成個 tab 區係最近收聽（佔滿、自己捲；分欄由 recentColumns，inline style） */
describe('recent-only tab', () => {
    it('should fill the tab area instead of the fixed panel height', () => {
        expect(cssDeclarations(css, ".recent[data-fill='true']")).toEqual({
            flex: '1 1 0',
            height: 'auto',
            'min-height': '0',
        });
        expect(cssDeclarations(css, '.recentList')['column-gap']).toBe('var(--saved-gap)');
        expect(cssDeclarations(css, '.recentRow')['break-inside']).toBe('avoid');
    });

    // W-535：分欄喺固定高度入面，放唔落嘅行會開新欄向右溢出、捲唔到；捲動要喺外層，ul 高度跟內容
    it('should scroll an outer wrapper and let the columned list grow to its content', () => {
        expect(cssDeclarations(css, '.recentScroll')).toMatchObject({
            flex: '1 1 0',
            'min-height': '0',
            'overflow-y': 'auto',
            'overscroll-behavior': 'contain',
        });
        const list = cssDeclarations(css, '.recentList');
        expect(list['overflow-y']).toBeUndefined();
        expect(list.flex).toBeUndefined();
        expect(list.height).toBeUndefined();
        expect(cssDeclarations(css, '.recentRow')['break-inside']).toBe('avoid');
    });

    it('should draw dividers under rows, so a new column does not start with a line', () => {
        expect(cssDeclarations(css, '.recentRow + .recentRow')).toEqual({});
        expect(cssDeclarations(css, '.recentRow:not(:last-child)')).toEqual({
            'border-bottom': '1px solid var(--saved-divider)',
        });
    });
});

/** 收藏 ↔ 最近收聽：舊內容淡出，新內容等佢淡完先淡入（_mockups_/qr-transfer .fade-layer） */
describe('saved / recent cross-fade', () => {
    it('should stack the leaving pane over the new one, untouchable', () => {
        expect(cssDeclarations(css, '.swap').position).toBe('relative');
        expect(cssDeclarations(css, '.saved[data-leaving]')).toMatchObject({
            position: 'absolute',
            inset: '0',
            'pointer-events': 'none',
        });
    });

    it('should only animate under prefers-reduced-motion: no-preference', () => {
        expect(atRuleDeclarations(css, MOTION, '.saved[data-leaving]').animation).toBe(
            `saved-pane-out ${FADE} forwards`,
        );
        expect(atRuleDeclarations(css, MOTION, '.saved[data-entering]').animation).toBe(
            `saved-pane-in ${FADE} var(--view-transition-fade) backwards`,
        );
        expect(cssDeclarations(css, '.saved[data-leaving]').animation).toBeUndefined();
        expect(cssDeclarations(css, '.saved[data-entering]').animation).toBeUndefined();
    });
});

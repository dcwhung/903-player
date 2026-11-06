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

/** B：成個 tab 區係最近收聽（佔滿、自己捲；欄數由 recentColumns，RecentPanel data-cols） */
describe('recent-only tab', () => {
    it('should fill the tab area instead of the fixed panel height', () => {
        expect(cssDeclarations(css, ".recent[data-fill='true']")).toEqual({
            flex: '1 1 0',
            height: 'auto',
            'min-height': '0',
        });
    });

    // W-535：捲動要喺外層，ul 高度跟內容
    it('should scroll an outer wrapper and let the list grow to its content', () => {
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
    });
});

/**
 * G（用戶決定）：兩欄時「左右左右」：最新喺左上，1、2 同一行，3、4 下一行…；單數左欄多一個。
 * CSS grid 行先排（唔再用 CSS 分欄直排），DOM / 讀屏 / Tab 次序 = 畫面次序
 */
describe('recent list row-major columns', () => {
    it('should lay rows out in a grid row by row instead of CSS columns', () => {
        const list = cssDeclarations(css, '.recentList');
        expect(list.display).toBe('grid');
        expect(list['grid-template-columns']).toBe('minmax(0, 1fr)');
        expect(list['column-gap']).toBe('var(--saved-gap)');
        expect(list['column-count']).toBeUndefined();
        expect(list['grid-auto-flow']).toBeUndefined();
        expect(cssDeclarations(css, ".recentList[data-cols='2']")['grid-template-columns']).toBe(
            'repeat(2, minmax(0, 1fr))',
        );
        expect(cssDeclarations(css, '.recentRow')['break-inside']).toBeUndefined();
    });

    // 分隔線畫喺每行頂（第一行唔畫）：兩欄時第一行兩格都冇線，下面每行左右各一條，唔會疊兩條
    it('should draw one divider above every grid row except the first', () => {
        expect(cssDeclarations(css, '.recentRow:not(:last-child)')).toEqual({});
        expect(cssDeclarations(css, '.recentRow + .recentRow')).toEqual({
            'border-top': '1px solid var(--saved-divider)',
        });
        expect(cssDeclarations(css, ".recentList[data-cols='2'] .recentRow:nth-child(2)")).toEqual({
            'border-top': 'none',
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

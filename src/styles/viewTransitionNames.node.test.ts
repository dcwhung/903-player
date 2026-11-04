// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../tests/cssRule';
import { TRANSITION_NAME } from '../utils/transitionNames';

const global = readCss(new URL('./global.css', import.meta.url));
const DURING = 'html[data-view-transition] main[data-player-page]';

/** 內頁成頁、頁頭、唱片格只喺過場期間先有名（平時唔變 stacking context，S-634） */
describe('inner page view transition names', () => {
    it.each([
        ['', TRANSITION_NAME.panel],
        [' h1', TRANSITION_NAME.title],
        [' [data-player-gauge]', TRANSITION_NAME.gauge],
    ])('should name %s only during a transition', (part, name) => {
        expect(cssDeclarations(global, `${DURING}${part}`)['view-transition-name']).toBe(name);
    });
});

/**
 * 閂卡：張卡成個縮入把手；開卡（P4 #3b O1）/ 換節目（S3）：成張卡一齊郁。
 * 入面嘅唱片格、名唔另外飛
 */
describe('card ↔ handle morph', () => {
    it('should drop the names inside the card while closing, opening or switching it', () => {
        // prettier 將長 :is() 拆行：cssDeclarations 將空白壓成一格
        const selector =
            "html:is( [data-view-transition='close'], [data-view-transition='open'], [data-view-transition='switch'] ) [data-home-card] *";
        expect(cssDeclarations(global, selector)['view-transition-name']).toBe('none !important');
    });

    it('should give the handle the card’s name only while closing', () => {
        const selector = "html[data-view-transition='close'] [data-home-handle]";
        expect(cssDeclarations(global, selector)['view-transition-name']).toBe(
            TRANSITION_NAME.panel,
        );
    });

    it('should not morph the handle into the card on open: the card slides in instead (O1)', () => {
        expect(global).not.toMatch(/'open'\][^{]*\[data-home-handle\]/);
    });
});

/**
 * 內頁有把手（播緊其他嘢，P3 #4）時返主頁：係把手放大做主頁播放卡，唔係成頁縮入去；
 * 只限 back，主頁把手嘅閂卡 / 開返規則（S-642）唔郁
 */
describe('inner page handle → home card morph', () => {
    const BACK = "html[data-view-transition='back']";
    const WITH_HANDLE = `${BACK} main[data-player-page]:has([data-page-handle])`;

    it.each([
        ['the page', WITH_HANDLE],
        ['its header and gauge', `${WITH_HANDLE} :is(h1, [data-player-gauge])`],
    ])('should drop the names of %s while going back', (_, selector) => {
        expect(cssDeclarations(global, selector)['view-transition-name']).toBe('none');
    });

    it('should give the page handle the card’s name while going back', () => {
        expect(cssDeclarations(global, `${BACK} [data-page-handle]`)['view-transition-name']).toBe(
            TRANSITION_NAME.panel,
        );
    });

    it('should leave the home handle rules to close / open only', () => {
        expect(global).not.toMatch(/'back'\][^{]*\[data-home-handle\]/);
    });
});

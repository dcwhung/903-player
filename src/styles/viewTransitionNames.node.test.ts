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

/** 閂卡 / 開返：張卡成個縮入把手，入面嘅唱片格、名唔另外飛 */
describe('card ↔ handle morph', () => {
    it('should drop the names inside the card while closing or reopening it', () => {
        const selector =
            "html:is([data-view-transition='close'], [data-view-transition='open']) [data-home-card] *";
        expect(cssDeclarations(global, selector)['view-transition-name']).toBe('none !important');
    });

    it('should give the handle the card’s name only while closing or reopening', () => {
        const selector =
            "html:is([data-view-transition='close'], [data-view-transition='open']) [data-home-handle]";
        expect(cssDeclarations(global, selector)['view-transition-name']).toBe(
            TRANSITION_NAME.panel,
        );
    });
});

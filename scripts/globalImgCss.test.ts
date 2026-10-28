// @vitest-environment node
// 放喺 scripts/：要用 node:fs 讀 CSS（見 launchThemeTokens.test.ts）
import { cssDeclarations, readCss } from '../tests/cssRule';

const GLOBAL_CSS = '../src/styles/global.css';

describe('global img CSS', () => {
    // CUI-0004 / S-548：app 入面嘅圖都係裝飾。Safari 唔理 draggable 屬性，滑鼠拖要靠 -webkit-user-drag 擋；
    // iOS 長撳唔好出圖片選單。全域規則，節目頁唱片、節目格、banner、全集表碟面一齊有
    it('should stop Safari dragging any image and showing the iOS long-press callout', () => {
        const img = cssDeclarations(readCss(new URL(GLOBAL_CSS, import.meta.url)), 'img');

        expect(img['-webkit-user-drag']).toBe('none');
        expect(img['-webkit-touch-callout']).toBe('none');
    });
});

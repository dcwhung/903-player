// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../../tests/cssRule';
import { LANDSCAPE_QUERY, SHORT_LANDSCAPE_QUERY } from '../../config/layout';

const page = readCss(new URL('./Page.module.css', import.meta.url));
const tokens = readCss(new URL('../../styles/tokens.css', import.meta.url));

/*
 * 闊橫版清單欄（wide list preview O3）：34%，最少 340px × --ui-scale；
 * 狀態一行由清單行自己用 em 保證（EpisodeList --episode-status-min），唔再靠估欄闊
 */
describe('landscape list column', () => {
    it('should size the list column from the landscape list tokens', () => {
        expect(cssDeclarations(page, '.fixed', LANDSCAPE_QUERY)['grid-template-columns']).toBe(
            'minmax(0, var(--landscape-list-width)) minmax(0, 1fr)',
        );
        const root = cssDeclarations(tokens, ':root');
        expect(root['--landscape-list-share']).toBe('34%');
        expect(root['--landscape-list-min']).toBe('calc(340px * var(--ui-scale))');
        expect(root['--landscape-list-width']).toBe(
            'max(var(--landscape-list-share), var(--landscape-list-min))',
        );
    });

    it('should keep the phone-sideways list column at 54%', () => {
        expect(
            cssDeclarations(page, '.fixed', SHORT_LANDSCAPE_QUERY)['grid-template-columns'],
        ).toBe('minmax(0, 54%) minmax(0, 1fr)');
    });
});

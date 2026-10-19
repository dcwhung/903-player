// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, cssValues, e2eShortHeightPx, readCss } from '../../tests/cssRule';

const css = (path: string) => readCss(new URL(path, import.meta.url));
const SHORT_HEIGHT_MEDIA = `(max-height: ${e2eShortHeightPx()}px)`;
const STACK_CSS = '../components/ShowCardStack/ShowCardStack.module.css';
const STRIP_CSS = '../components/DateStrip/DateStrip.module.css';

/*
 * iOS standalone PWA：成頁唔可以捲 / 橡筋，只有清單 panel 自己捲；
 * 唔喺捲動容器入面嘅 swipe 區要擋晒單指 pan（touch-action: pinch-zoom，舊瀏覽器後備 none），
 * 否則 iOS 開始原生 pan 就 pointercancel；雙指放大照得（無障礙）。
 * Chromium e2e 模擬唔到 iOS 橡筋，所以喺度直接鎖死 CSS 設定。
 */
describe('iOS touch lock', () => {
    it('should lock html, body and #root into a fixed, non-scrolling shell', () => {
        const shell = cssDeclarations(css('./global.css'), 'html, body, #root');

        expect(shell).toMatchObject({
            height: '100%',
            overflow: 'hidden',
            'overscroll-behavior': 'none',
        });
    });

    it('should paint the canvas behind the home indicator with the page colour', () => {
        expect(cssDeclarations(css('./global.css'), 'html').background).toBe(
            'var(--page-canvas, var(--color-bg))',
        );
    });

    it('should make the full-page theme scope and locked main fill the shell exactly', () => {
        const scope = css('../components/ThemeScope/ThemeScope.module.css');
        const page = css('../pages/Page.module.css');

        expect(cssDeclarations(scope, '.scope').height).toBe('100%');
        expect(cssDeclarations(page, '.locked')).toMatchObject({
            height: '100%',
            overflow: 'hidden',
        });
        expect(cssDeclarations(page, '.page')['box-sizing']).toBe('border-box');
    });

    it.each([
        ['ShowCardStack .stack', STACK_CSS, '.stack'],
        ['DateStrip .strip', STRIP_CSS, '.strip'],
        ['MiniPlayer .player', '../components/MiniPlayer/MiniPlayer.module.css', '.player'],
    ])('should block single-finger pan but allow pinch-zoom on the %s', (_name, path, selector) => {
        expect(cssValues(css(path), selector, 'touch-action')).toEqual(['none', 'pinch-zoom']);
    });

    // 好矮畫面 main 自己捲：卡疊同日子條要畀返直向 pan，橫拖照由 pointer events 處理
    it.each([
        ['ShowCardStack .stack', STACK_CSS, '.stack'],
        ['DateStrip .strip', STRIP_CSS, '.strip'],
    ])('should give the %s vertical pan back at short heights', (_name, path, selector) => {
        expect(cssValues(css(path), selector, 'touch-action', SHORT_HEIGHT_MEDIA)).toEqual([
            'pan-y pinch-zoom',
        ]);
    });

    it('should not let !important pass as a plain touch-action value', () => {
        const declarations = cssDeclarations(
            `@media ${SHORT_HEIGHT_MEDIA} { .stack { touch-action: pan-y !important; } }`,
            '.stack',
            SHORT_HEIGHT_MEDIA,
        );

        expect(declarations['touch-action']).toBe('pan-y !important');
        expect(
            cssDeclarations('.stack { touch-action: none; }', '.stack', SHORT_HEIGHT_MEDIA),
        ).toEqual({});
    });

    it.each([
        ['EpisodeList', '../components/EpisodeList/EpisodeList.module.css'],
        ['TodayShowList', '../components/TodayShowList/TodayShowList.module.css'],
    ])('should keep native scrolling in the %s panel', (_name, path) => {
        expect(cssDeclarations(css(path), '.list')).toMatchObject({
            'overflow-y': 'auto',
            'overscroll-behavior': 'contain',
        });
    });
});

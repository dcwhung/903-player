// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import {
    atRuleDeclarations,
    atRuleSelectors,
    cssDeclarations,
    cssValues,
    e2eShortHeightPx,
    readCss,
} from '../../tests/cssRule';

const css = (path: string) => readCss(new URL(path, import.meta.url));
const SHORT_HEIGHT_MEDIA = `(max-height: ${e2eShortHeightPx()}px)`;
const STACK_CSS = '../components/ShowCardStack/ShowCardStack.module.css';
const STRIP_CSS = '../components/DateStrip/DateStrip.module.css';
const DRAMA_CSS = '../components/DramaShelf/DramaShelf.module.css';

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

    /*
     * 直版廣播劇書架放得晒（唔使捲）：手指上下捽揀 focus（useShelfScrub），單指 pan 要擋，
     * 否則 iOS 開始原生 pan 就 pointercancel；放唔晒（data-scroll）要保留原生捲動 + snap，唔可以擋
     */
    it('should block single-finger pan on the drama shelf only while it does not scroll', () => {
        const shelf = css(DRAMA_CSS);

        expect(cssValues(shelf, '.shelf[data-stacked]:not([data-scroll])', 'touch-action')).toEqual(
            ['none', 'pinch-zoom'],
        );
        expect(cssValues(shelf, '.shelf[data-stacked][data-scroll]', 'touch-action')).toEqual([]);
        expect(cssValues(shelf, '.shelf[data-stacked]', 'touch-action')).toEqual([]);
    });

    // 任何高度都固定（冇成頁捲）：好矮嘅畫面卡疊同日子條都照樣擋晒單指 pan，唔畀返 pan-y
    it.each([
        ['ShowCardStack .stack', STACK_CSS, '.stack'],
        ['DateStrip .strip', STRIP_CSS, '.strip'],
    ])('should keep the %s locked at short heights', (_name, path, selector) => {
        expect(cssValues(css(path), selector, 'touch-action', SHORT_HEIGHT_MEDIA)).toEqual([]);
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

    it('should read the rules inside a given at-rule, and only there', () => {
        const source = `
            .shell { height: 100%; }
            @supports (height: 1cqh) { .shell { height: 50cqh; } .disc { width: 1cqh; } }
            @media (max-height: 561px) { @supports (height: 1cqh) { .shell { height: 1px; } } }
        `;

        expect(atRuleDeclarations(source, '@supports  (height: 1cqh)', '.shell')).toEqual({
            height: '50cqh',
        });
        expect(atRuleSelectors(source, '@supports (height: 1cqh)')).toEqual(['.shell', '.disc']);
        expect(
            atRuleDeclarations(
                source,
                '@media (max-height: 561px) @supports (height: 1cqh)',
                '.shell',
            ),
        ).toEqual({ height: '1px' });
        expect(cssDeclarations(source, '.shell')).toEqual({ height: '100%' });
        expect(atRuleDeclarations(source, '@media (max-height: 561px)', '.shell')).toEqual({});
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

import { cssDeclarations, readCss } from '../../tests/cssRule';

const css = (path: string) => readCss(new URL(path, import.meta.url));

/*
 * iOS standalone PWA：成頁唔可以捲 / 橡筋，只有清單 panel 自己捲；
 * 唔喺捲動容器入面嘅 swipe 區要 touch-action: none，否則 iOS 開始原生 pan 就 pointercancel。
 * Chromium e2e 模擬唔到 iOS 橡筋，所以喺度直接鎖死 CSS 設定。
 */
describe('iOS touch lock', () => {
    it('should lock html, body and #root into a fixed, non-scrolling shell', async () => {
        const shell = cssDeclarations(await css('./global.css'), 'html, body, #root');

        expect(shell).toMatchObject({
            height: '100%',
            overflow: 'hidden',
            'overscroll-behavior': 'none',
        });
    });

    it('should paint the canvas behind the home indicator with the page colour', async () => {
        expect(cssDeclarations(await css('./global.css'), 'html').background).toBe(
            'var(--page-canvas, var(--color-bg))',
        );
    });

    it('should make the full-page theme scope and locked main fill the shell exactly', async () => {
        const scope = await css('../components/ThemeScope/ThemeScope.module.css');
        const page = await css('../pages/Page.module.css');

        expect(cssDeclarations(scope, '.scope').height).toBe('100%');
        expect(cssDeclarations(page, '.locked')).toMatchObject({
            height: '100%',
            overflow: 'hidden',
        });
        expect(cssDeclarations(page, '.page')['box-sizing']).toBe('border-box');
    });

    it.each([
        ['ShowCardStack .stack', '../components/ShowCardStack/ShowCardStack.module.css', '.stack'],
        ['DateStrip .strip', '../components/DateStrip/DateStrip.module.css', '.strip'],
        ['MiniPlayer .player', '../components/MiniPlayer/MiniPlayer.module.css', '.player'],
    ])('should give the %s swipe zone touch-action: none', async (_name, path, selector) => {
        expect(cssDeclarations(await css(path), selector)['touch-action']).toBe('none');
    });

    it.each([
        ['EpisodeList', '../components/EpisodeList/EpisodeList.module.css'],
        ['TodayShowList', '../components/TodayShowList/TodayShowList.module.css'],
    ])('should keep native scrolling in the %s panel', async (_name, path) => {
        expect(cssDeclarations(await css(path), '.list')).toMatchObject({
            'overflow-y': 'auto',
            'overscroll-behavior': 'contain',
        });
    });
});

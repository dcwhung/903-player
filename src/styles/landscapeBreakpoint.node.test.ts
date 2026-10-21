// @vitest-environment node
// 要用 node:fs 讀 CSS / e2e 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { e2eShortHeightPx, mediaQueries, readCss } from '../../tests/cssRule';
import { LANDSCAPE_QUERY, SHORT_LANDSCAPE_QUERY, WIDE_BANNER_QUERY } from '../config/layout';

/*
 * 橫版斷點：@media 條件用唔到變數，JS（useMediaQuery、<source media>）同 CSS 各自寫一次，
 * 靠呢個測試鎖住兩邊一樣。
 */
const CSS_WITH_LANDSCAPE = [
    '../pages/Page.module.css',
    '../pages/HomePage.module.css',
    '../components/ShowGrid/ShowGrid.module.css',
    '../components/ShowTile/ShowTile.module.css',
    '../components/HomeBanner/HomeBanner.module.css',
    '../components/DateStrip/DateStrip.module.css',
    '../components/ShowCardStack/ShowCardStack.module.css',
    './tokens.css',
];

const landscapeQueries = (): string[] =>
    CSS_WITH_LANDSCAPE.flatMap((path) =>
        mediaQueries(readCss(new URL(path, import.meta.url))).filter((query) =>
            query.includes('orientation: landscape'),
        ),
    );

describe('landscape breakpoint', () => {
    it('should start every landscape @media with LANDSCAPE_QUERY or a wider-screen variant', () => {
        const queries = landscapeQueries();

        expect(queries.length).toBeGreaterThan(0);
        for (const query of queries) {
            expect(
                query.startsWith(LANDSCAPE_QUERY) ||
                    query.startsWith('(orientation: landscape) and (min-width: 1024px)'),
            ).toBe(true);
        }
    });

    it('should spell the phone-sideways and wide-banner variants exactly like layout.ts', () => {
        const variants = landscapeQueries().filter(
            (query) => query.startsWith(LANDSCAPE_QUERY) && query !== LANDSCAPE_QUERY,
        );

        expect(variants.length).toBeGreaterThan(0);
        for (const query of variants) {
            expect([SHORT_LANDSCAPE_QUERY, WIDE_BANNER_QUERY]).toContain(query);
        }
    });

    it('should switch phone-sideways layout at the same height as SHORT_HEIGHT_PX', () => {
        expect(SHORT_LANDSCAPE_QUERY).toContain(`(max-height: ${e2eShortHeightPx()}px)`);
        expect(WIDE_BANNER_QUERY).toContain(`(min-height: ${e2eShortHeightPx() + 1}px)`);
    });
});

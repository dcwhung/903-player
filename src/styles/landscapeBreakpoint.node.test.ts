// @vitest-environment node
// 要用 node:fs 讀 CSS / e2e 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { readdirSync } from 'node:fs';
import {
    cssDeclarations,
    e2eLandscapeMinWidthPx,
    e2eShortHeightPx,
    mediaQueries,
    readCss,
} from '../../tests/cssRule';
import { LANDSCAPE_QUERY, SHORT_LANDSCAPE_QUERY, WIDE_BANNER_QUERY } from '../config/layout';

/*
 * 橫版斷點：@media 條件用唔到變數，JS（useMediaQuery、<source media>）同 CSS 各自寫一次，
 * 靠呢個測試鎖住兩邊一樣。
 */
const SRC = new URL('../', import.meta.url);
/** src 入面全部 CSS（新加嘅 module 都會檢查） */
const CSS_FILES = readdirSync(SRC, { recursive: true })
    .map(String)
    .filter((path) => path.endsWith('.css'));

const landscapeQueries = (): string[] =>
    CSS_FILES.flatMap((path) =>
        mediaQueries(readCss(new URL(path, SRC))).filter((query) =>
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

    it('should use the same minimum width as LANDSCAPE_MIN_WIDTH_PX in the e2e runner', () => {
        expect(LANDSCAPE_QUERY).toContain(`(min-width: ${e2eLandscapeMinWidthPx()}px)`);
    });

    it('should keep the touch tokens in the scaled calc(Npx * var(--ui-scale)) shape cssPx reads', () => {
        // useRowsPerPage 經 cssPx 讀 --touch-target-min：改咗寫法要一齊改 cssPx
        const tokens = cssDeclarations(readCss(new URL('./tokens.css', import.meta.url)), ':root');

        expect(tokens['--touch-target-min']).toMatch(/^calc\(\d+px \* var\(--ui-scale\)\)$/);
    });

    it('should switch phone-sideways layout at the same height as SHORT_HEIGHT_PX', () => {
        expect(SHORT_LANDSCAPE_QUERY).toContain(`(max-height: ${e2eShortHeightPx()}px)`);
        expect(WIDE_BANNER_QUERY).toContain(`(min-height: ${e2eShortHeightPx() + 1}px)`);
    });
});

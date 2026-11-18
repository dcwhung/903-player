// @vitest-environment node
import postcss from 'postcss';
import {
    DUO_COVER_LANDSCAPE_QUERY,
    LANDSCAPE_QUERY,
    SHORT_LANDSCAPE_QUERY,
    SQUARE_QUERY,
    WIDE_BANNER_QUERY,
} from '../src/config/layout';
import { mediaQueries } from '../tests/cssRule';
import { SQUARE_CLONE_MARKER, duoLandscape } from './postcssDuoLandscape';

const transform = (css: string): string =>
    postcss([duoLandscape()]).process(css, { from: undefined }).css;

const squash = (css: string): string => css.replace(/\s+/g, ' ').trim();

describe('duoLandscape（PostCSS plugin）', () => {
    it.each([
        ['橫版', LANDSCAPE_QUERY],
        ['手機打橫', SHORT_LANDSCAPE_QUERY],
    ])('%s區塊：緊跟住加一份 Duo 闔上・橫嘅複製品，原本嗰份唔郁', (_name, query) => {
        const css = `.a { color: red; } @media ${query} { .a { color: blue; } } .b { color: green; }`;

        expect(squash(transform(css))).toBe(
            squash(
                `.a { color: red; } @media ${query} { .a { color: blue; } } ` +
                    `@media ${DUO_COVER_LANDSCAPE_QUERY} { .a { color: blue; } } .b { color: green; }`,
            ),
        );
    });

    it.each([
        ['闊橫版', WIDE_BANNER_QUERY],
        ['大畫面', '(orientation: landscape) and (min-width: 1024px) and (min-height: 562px)'],
        ['矮螢幕', '(max-height: 561px)'],
        ['減少動態', '(prefers-reduced-motion: reduce)'],
        ['已經係 Duo', DUO_COVER_LANDSCAPE_QUERY],
    ])('%s區塊：唔複製', (_name, query) => {
        const css = `@media ${query} { .a { color: blue; } }`;

        expect(squash(transform(css))).toBe(squash(css));
    });

    it('同一個檔多個區塊：每份複製品跟住自己嗰份原本，次序唔變', () => {
        const css =
            `@media ${LANDSCAPE_QUERY} { .a { order: 1; } } ` +
            `@media ${SHORT_LANDSCAPE_QUERY} { .a { order: 2; } } ` +
            `@media ${LANDSCAPE_QUERY} { .a { order: 3; } }`;

        expect(mediaQueries(transform(css))).toEqual([
            LANDSCAPE_QUERY,
            DUO_COVER_LANDSCAPE_QUERY,
            SHORT_LANDSCAPE_QUERY,
            DUO_COVER_LANDSCAPE_QUERY,
            LANDSCAPE_QUERY,
            DUO_COVER_LANDSCAPE_QUERY,
        ]);
        expect(transform(css).match(/order: \d/g)).toEqual([
            'order: 1',
            'order: 1',
            'order: 2',
            'order: 2',
            'order: 3',
            'order: 3',
        ]);
    });

    it('條件多咗空白 / 換行都認得', () => {
        const css = `@media (orientation: landscape)   and\n (min-width: 640px) { .a { color: blue; } }`;

        expect(mediaQueries(transform(css))).toContain(DUO_COVER_LANDSCAPE_QUERY);
    });

    it('行兩次都只得一份複製品（已經複製過嘅唔再複製）', () => {
        const css = `@media ${LANDSCAPE_QUERY} { .a { color: blue; } }`;

        expect(mediaQueries(transform(transform(css)))).toEqual([
            LANDSCAPE_QUERY,
            DUO_COVER_LANDSCAPE_QUERY,
        ]);
    });

    it('原本嗰份後面緊接人手寫嘅 Duo 區塊（內容唔同）：照樣複製，人手嗰份留喺後面', () => {
        const css =
            `@media ${LANDSCAPE_QUERY} { .a { color: blue; } } ` +
            `@media ${DUO_COVER_LANDSCAPE_QUERY} { .a { width: 46%; } }`;

        const out = transform(css);
        expect(mediaQueries(out)).toEqual([
            LANDSCAPE_QUERY,
            DUO_COVER_LANDSCAPE_QUERY,
            DUO_COVER_LANDSCAPE_QUERY,
        ]);
        expect(out.indexOf('color: blue', out.indexOf(DUO_COVER_LANDSCAPE_QUERY))).toBeLessThan(
            out.indexOf('width: 46%'),
        );
    });

    describe('HomeView（SQUARE_QUERY）', () => {
        const marked = `/* ${SQUARE_CLONE_MARKER} */ @media ${WIDE_BANNER_QUERY} { .a { color: blue; } }`;

        it('闊橫版區塊前面有記號：緊跟住加一份 HomeView 複製品', () => {
            expect(mediaQueries(transform(marked))).toEqual([WIDE_BANNER_QUERY, SQUARE_QUERY]);
            expect(transform(marked).match(/color: blue/g)).toHaveLength(2);
        });

        it('冇記號嘅闊橫版區塊：唔複製', () => {
            const css = `/* 普通註解 */ @media ${WIDE_BANNER_QUERY} { .a { color: blue; } }`;

            expect(mediaQueries(transform(css))).toEqual([WIDE_BANNER_QUERY]);
        });

        it('記號只認闊橫版區塊（其他條件唔複製去 HomeView）', () => {
            const css = `/* ${SQUARE_CLONE_MARKER} */ @media ${LANDSCAPE_QUERY} { .a { color: blue; } }`;

            expect(mediaQueries(transform(css))).toEqual([
                LANDSCAPE_QUERY,
                DUO_COVER_LANDSCAPE_QUERY,
            ]);
        });

        it('行兩次都只得一份複製品', () => {
            expect(mediaQueries(transform(transform(marked)))).toEqual([
                WIDE_BANNER_QUERY,
                SQUARE_QUERY,
            ]);
        });
    });
});

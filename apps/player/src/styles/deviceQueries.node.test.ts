// @vitest-environment node
// iPhone Duo / HomeView 嘅裝置 query（P10，v2.0.0）：新版面只可以喺呢啲範圍生效，
// 現有手機直 / 橫、平板直 / 橫、電腦橫版（e2e/visualModel.mjs 凍結清單）一個都唔可以 match。
import { readdirSync } from 'node:fs';
import { VISUAL_VIEWPORTS } from '../../e2e/visualModel.mjs';
import { mediaQueries, readCss } from '../../tests/cssRule';
import { matchesQuery } from '../../tests/mediaQuery';
import {
    DUO_COVER_LANDSCAPE_QUERY,
    DUO_COVER_PORTRAIT_QUERY,
    DUO_OPEN_LANDSCAPE_QUERY,
    DUO_OPEN_PORTRAIT_QUERY,
    DUO_QUERY,
    LANDSCAPE_LAYOUT_QUERY,
    LANDSCAPE_QUERY,
    SHELF_SPLIT_QUERY,
    SHORT_LANDSCAPE_LAYOUT_QUERY,
    SHORT_LANDSCAPE_QUERY,
    SQUARE_QUERY,
    WIDE_BANNER_QUERY,
} from '../config/layout';

const DEVICE_QUERIES = {
    DUO_COVER_PORTRAIT_QUERY,
    DUO_COVER_LANDSCAPE_QUERY,
    DUO_OPEN_LANDSCAPE_QUERY,
    DUO_OPEN_PORTRAIT_QUERY,
    SQUARE_QUERY,
};

/** Progressier simulator 實測（_mockups_/iphone-duo）同佢 FAQ 寫嘅尺寸；HomeView 係假設值 */
const DEVICES: readonly { name: string; width: number; height: number; query: string }[] = [
    { name: '闔上・直（實測）', width: 426, height: 612, query: DUO_COVER_PORTRAIT_QUERY },
    { name: '闔上・直（FAQ）', width: 466, height: 678, query: DUO_COVER_PORTRAIT_QUERY },
    { name: '闔上・橫 / Standing', width: 612, height: 426, query: DUO_COVER_LANDSCAPE_QUERY },
    { name: 'Seated 上半', width: 612, height: 438, query: DUO_COVER_LANDSCAPE_QUERY },
    { name: '打開・橫（實測）', width: 876, height: 612, query: DUO_OPEN_LANDSCAPE_QUERY },
    { name: '打開・橫（FAQ）', width: 890, height: 626, query: DUO_OPEN_LANDSCAPE_QUERY },
    { name: '打開・直', width: 612, height: 876, query: DUO_OPEN_PORTRAIT_QUERY },
    { name: 'HomeView', width: 544, height: 544, query: SQUARE_QUERY },
];

describe('裝置 query', () => {
    it.each(DEVICES)('$name（$width×$height）只 match 自己嗰句', (device) => {
        const matched = Object.values(DEVICE_QUERIES).filter((query) =>
            matchesQuery(query, device),
        );

        expect(matched).toEqual([device.query]);
    });

    it.each(VISUAL_VIEWPORTS.map((viewport) => [viewport.id, viewport] as const))(
        '現有裝置 %s 一句都唔 match',
        (_id, viewport) => {
            for (const [name, query] of Object.entries(DEVICE_QUERIES)) {
                expect(matchesQuery(query, viewport), name).toBe(false);
            }
            expect(matchesQuery(DUO_QUERY, viewport)).toBe(false);
            expect(matchesQuery(SHELF_SPLIT_QUERY, viewport)).toBe(false);
        },
    );

    it.each(VISUAL_VIEWPORTS.map((viewport) => [viewport.id, viewport] as const))(
        '現有裝置 %s：合併咗 Duo 嘅橫版 query 同原本嗰句結果一樣',
        (_id, viewport) => {
            expect(matchesQuery(LANDSCAPE_LAYOUT_QUERY, viewport)).toBe(
                matchesQuery(LANDSCAPE_QUERY, viewport),
            );
            expect(matchesQuery(SHORT_LANDSCAPE_LAYOUT_QUERY, viewport)).toBe(
                matchesQuery(SHORT_LANDSCAPE_QUERY, viewport),
            );
        },
    );

    it('闔上・橫入手機打橫版面，但唔係闊橫版', () => {
        const cover = { width: 612, height: 426 };

        expect(matchesQuery(LANDSCAPE_QUERY, cover)).toBe(false);
        expect(matchesQuery(LANDSCAPE_LAYOUT_QUERY, cover)).toBe(true);
        expect(matchesQuery(SHORT_LANDSCAPE_LAYOUT_QUERY, cover)).toBe(true);
        expect(matchesQuery(WIDE_BANNER_QUERY, cover)).toBe(false);
    });

    it('DUO_QUERY = Duo 四種姿勢（唔包 HomeView）', () => {
        for (const device of DEVICES) {
            expect(matchesQuery(DUO_QUERY, device), device.name).toBe(
                device.query !== SQUARE_QUERY,
            );
        }
    });

    it('SHELF_SPLIT_QUERY = Duo 打開・橫 + HomeView', () => {
        for (const device of DEVICES) {
            expect(matchesQuery(SHELF_SPLIT_QUERY, device), device.name).toBe(
                device.query === DUO_OPEN_LANDSCAPE_QUERY || device.query === SQUARE_QUERY,
            );
        }
    });
});

describe('CSS 入面嘅裝置 query', () => {
    const SRC = new URL('../', import.meta.url);
    /** 現有三個斷點 + 大畫面變體以外，有闊度上限（max-width）嘅就係裝置 query */
    const deviceMediaQueries = (): string[] =>
        readdirSync(SRC, { recursive: true })
            .map(String)
            .filter((path) => path.endsWith('.css'))
            .flatMap((path) => mediaQueries(readCss(new URL(path, SRC))))
            .filter((query) => query.includes('max-width'));

    it('同 layout.ts 嘅常數一字不差（@media 用唔到變數，CSS 要寫返同一句）', () => {
        const allowed = [...Object.values(DEVICE_QUERIES), DUO_QUERY, SHELF_SPLIT_QUERY];
        const queries = deviceMediaQueries();

        expect(queries.length).toBeGreaterThan(0);
        for (const query of queries) expect(allowed).toContain(query);
    });
});
